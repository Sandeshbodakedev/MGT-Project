import os
import io
import csv
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc

from .database import engine, Base, get_db
from .models import User, Review
from .schemas import (
    UserRegister, UserLogin, UserResponse, UserApiKeyUpdate, Token,
    ReviewCreate, ReviewBatchPaste, ReviewResponse, PaginatedReviewsResponse,
    DashboardStats, SentimentCount, TopicCount, UrgencyCount, TrendPoint, AIExecutiveSummary
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from .analyzer import analyze_reviews, generate_executive_summary
from .sample_data import SAMPLE_REVIEWS

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Customer Feedback Analyzer API",
    description="AI-powered customer review analysis with sentiment, topic, and urgency classification",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def log_request_path(request: Request, call_next):
    # Support Vercel query parameter path forwarding
    real_path = request.query_params.get("__path__")
    if real_path:
        if not real_path.startswith("/"):
            real_path = f"/{real_path}"
        if not real_path.startswith("/api"):
            real_path = f"/api{real_path}"
        request.scope["path"] = real_path
    else:
        path = request.scope.get("path", "")
        if path and not path.startswith("/api"):
            request.scope["path"] = f"/api{path}"
    return await call_next(request)

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/index.py")
@app.get("/index.py")
def vercel_index_diagnostic(request: Request):
    return {
        "status": "ok",
        "scope_path": request.scope.get("path"),
        "headers": dict(request.headers)
    }


# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.post("/api/auth/register", response_model=Token)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    hashed_pwd = hash_password(payload.password)
    user = User(
        email=payload.email,
        full_name=payload.full_name or payload.email.split("@")[0],
        hashed_password=hashed_pwd,
        claude_api_key=payload.claude_api_key
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at,
            "has_claude_key": bool(user.claude_api_key)
        }
    }

@app.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at,
            "has_claude_key": bool(user.claude_api_key)
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at,
        "has_claude_key": bool(current_user.claude_api_key)
    }

@app.put("/api/auth/api-key")
def update_api_key(
    payload: UserApiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.claude_api_key = payload.claude_api_key.strip() if payload.claude_api_key else None
    db.commit()
    return {"message": "Claude API key updated successfully", "has_claude_key": bool(current_user.claude_api_key)}


# ==========================================
# REVIEW INGESTION & ANALYSIS ROUTES
# ==========================================

@app.post("/api/reviews/paste", response_model=List[ReviewResponse])
async def paste_reviews(
    payload: ReviewBatchPaste,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    items_to_process = []
    
    # Process structured items if provided
    if payload.items:
        items_to_process.extend(payload.items)
    
    # Process raw_text (one review per non-empty line or numbered block)
    if payload.raw_text:
        lines = payload.raw_text.strip().split("\n")
        current_chunk = []
        for line in lines:
            line_str = line.strip()
            if not line_str:
                if current_chunk:
                    items_to_process.append(ReviewCreate(text=" ".join(current_chunk)))
                    current_chunk = []
            else:
                # Remove common leading list markers like "1. ", "- ", "* "
                import re
                cleaned = re.sub(r'^\s*(\d+[\.\)]|\-|\*)\s*', '', line_str)
                if cleaned:
                    current_chunk.append(cleaned)
        if current_chunk:
            items_to_process.append(ReviewCreate(text=" ".join(current_chunk)))

    if not items_to_process:
        raise HTTPException(status_code=400, detail="No valid review text provided to analyze.")

    texts = [item.text for item in items_to_process]
    ratings = [item.rating for item in items_to_process]
    user_key = current_user.claude_api_key if current_user else None

    # Run AI analysis (Claude with VADER fallback)
    analysis_results = await analyze_reviews(texts, ratings, user_api_key=user_key)

    created_reviews = []
    user_id = current_user.id if current_user else None

    for item, analysis in zip(items_to_process, analysis_results):
        review = Review(
            user_id=user_id,
            source_type="paste",
            customer_name=item.customer_name or "Anonymous",
            text=item.text,
            rating=item.rating,
            review_date=item.review_date or datetime.utcnow(),
            sentiment=analysis["sentiment"],
            sentiment_score=analysis["sentiment_score"],
            topic=analysis["topic"],
            urgency=analysis["urgency"],
            ai_summary=analysis.get("ai_summary"),
            analysis_provider=analysis.get("analysis_provider", "vader_keyword")
        )
        db.add(review)
        created_reviews.append(review)

    db.commit()
    for r in created_reviews:
        db.refresh(r)

    return created_reviews


@app.post("/api/reviews/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Only CSV or TXT files are accepted.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except UnicodeDecodeError:
            decoded = content.decode("utf-8", errors="ignore")

    csv_reader = csv.reader(io.StringIO(decoded))
    rows = list(csv_reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    header = [h.strip().lower() for h in rows[0]]
    
    # Identify column indices
    text_idx = -1
    rating_idx = -1
    name_idx = -1
    date_idx = -1

    for idx, col in enumerate(header):
        if any(keyword in col for keyword in ["review", "text", "comment", "feedback", "body", "content", "message"]):
            if text_idx == -1:
                text_idx = idx
        elif any(keyword in col for keyword in ["rating", "score", "stars", "star"]):
            if rating_idx == -1:
                rating_idx = idx
        elif any(keyword in col for keyword in ["name", "customer", "user", "author", "client"]):
            if name_idx == -1:
                name_idx = idx
        elif any(keyword in col for keyword in ["date", "time", "created", "timestamp"]):
            if date_idx == -1:
                date_idx = idx

    # If header didn't match, check if first row itself might be text
    if text_idx == -1:
        text_idx = 0  # Default to first column

    data_rows = rows[1:] if len(rows) > 1 else rows

    reviews_to_analyze = []
    for r in data_rows:
        if not r or len(r) <= text_idx:
            continue
        text_val = r[text_idx].strip()
        if not text_val:
            continue

        rating_val = None
        if rating_idx != -1 and len(r) > rating_idx:
            try:
                import re
                clean_num = re.findall(r"[-+]?(?:\d*\.\d+|\d+)", r[rating_idx])
                if clean_num:
                    rating_val = float(clean_num[0])
            except (ValueError, TypeError):
                pass

        name_val = "Anonymous"
        if name_idx != -1 and len(r) > name_idx and r[name_idx].strip():
            name_val = r[name_idx].strip()

        date_val = datetime.utcnow()
        if date_idx != -1 and len(r) > date_idx and r[date_idx].strip():
            raw_d = r[date_idx].strip()
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                try:
                    date_val = datetime.strptime(raw_d, fmt)
                    break
                except ValueError:
                    pass

        reviews_to_analyze.append({
            "text": text_val,
            "rating": rating_val,
            "name": name_val,
            "date": date_val
        })

    if not reviews_to_analyze:
        raise HTTPException(status_code=400, detail="Could not extract any valid review records from CSV.")

    texts = [item["text"] for item in reviews_to_analyze]
    ratings = [item["rating"] for item in reviews_to_analyze]
    user_key = current_user.claude_api_key if current_user else None

    # Batch analysis in chunks of 50 to avoid timeout
    chunk_size = 50
    all_analysis = []
    for i in range(0, len(texts), chunk_size):
        chunk_texts = texts[i:i + chunk_size]
        chunk_ratings = ratings[i:i + chunk_size]
        chunk_results = await analyze_reviews(chunk_texts, chunk_ratings, user_api_key=user_key)
        all_analysis.extend(chunk_results)

    user_id = current_user.id if current_user else None
    saved_count = 0
    for item, analysis in zip(reviews_to_analyze, all_analysis):
        review = Review(
            user_id=user_id,
            source_type="csv",
            customer_name=item["name"],
            text=item["text"],
            rating=item["rating"],
            review_date=item["date"],
            sentiment=analysis["sentiment"],
            sentiment_score=analysis["sentiment_score"],
            topic=analysis["topic"],
            urgency=analysis["urgency"],
            ai_summary=analysis.get("ai_summary"),
            analysis_provider=analysis.get("analysis_provider", "vader_keyword")
        )
        db.add(review)
        saved_count += 1

    db.commit()
    return {"message": f"Successfully analyzed and imported {saved_count} reviews from CSV.", "count": saved_count}


@app.post("/api/reviews/load-sample")
async def load_sample_reviews(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    user_key = current_user.claude_api_key if current_user else None

    texts = [item["text"] for item in SAMPLE_REVIEWS]
    ratings = [item["rating"] for item in SAMPLE_REVIEWS]

    analysis_results = await analyze_reviews(texts, ratings, user_api_key=user_key)

    now = datetime.utcnow()
    for item, analysis in zip(SAMPLE_REVIEWS, analysis_results):
        offset = item.get("date_offset_days", 0)
        review_date = now - timedelta(days=offset)

        review = Review(
            user_id=user_id,
            source_type="sample",
            customer_name=item.get("customer_name", "Valued Customer"),
            text=item["text"],
            rating=item.get("rating"),
            review_date=review_date,
            sentiment=analysis["sentiment"],
            sentiment_score=analysis["sentiment_score"],
            topic=analysis["topic"],
            urgency=analysis["urgency"],
            ai_summary=analysis.get("ai_summary"),
            analysis_provider=analysis.get("analysis_provider", "vader_keyword")
        )
        db.add(review)

    db.commit()
    return {"message": f"Successfully loaded and analyzed {len(SAMPLE_REVIEWS)} sample customer reviews."}


@app.get("/api/reviews", response_model=PaginatedReviewsResponse)
def get_reviews(
    sentiment: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    sort_by: str = Query("date", pattern="^(date|rating|urgency|sentiment)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Review)
    if current_user:
        query = query.filter((Review.user_id == current_user.id) | (Review.user_id == None))

    if sentiment:
        query = query.filter(Review.sentiment.ilike(sentiment))
    if topic:
        query = query.filter(Review.topic.ilike(topic))
    if urgency:
        query = query.filter(Review.urgency.ilike(urgency))
    if min_rating is not None:
        query = query.filter(Review.rating >= min_rating)
    if max_rating is not None:
        query = query.filter(Review.rating <= max_rating)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Review.text.ilike(search_fmt)) |
            (Review.customer_name.ilike(search_fmt)) |
            (Review.topic.ilike(search_fmt))
        )

    # Sorting
    order_func = desc if sort_order == "desc" else asc
    if sort_by == "date":
        query = query.order_by(order_func(Review.review_date))
    elif sort_by == "rating":
        query = query.order_by(order_func(Review.rating))
    elif sort_by == "urgency":
        # Custom urgency order
        query = query.order_by(order_func(Review.urgency))
    elif sort_by == "sentiment":
        query = query.order_by(order_func(Review.sentiment_score))
    else:
        query = query.order_by(desc(Review.review_date))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": items
    }


@app.delete("/api/reviews/{review_id}")
def delete_review(
    review_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Review).filter(Review.id == review_id)
    if current_user:
        query = query.filter((Review.user_id == current_user.id) | (Review.user_id == None))
    review = query.first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}


@app.delete("/api/reviews")
def clear_all_reviews(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Review)
    if current_user:
        query = query.filter((Review.user_id == current_user.id) | (Review.user_id == None))
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} reviews"}


# ==========================================
# ANALYTICS & DASHBOARD ROUTES
# ==========================================

@app.get("/api/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_analytics(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Review)
    if current_user:
        query = query.filter((Review.user_id == current_user.id) | (Review.user_id == None))

    all_reviews = query.all()
    total = len(all_reviews)

    if total == 0:
        return {
            "total_reviews": 0,
            "avg_rating": None,
            "nps_estimate": None,
            "positive_percentage": 0.0,
            "negative_percentage": 0.0,
            "neutral_percentage": 0.0,
            "critical_count": 0,
            "high_urgency_count": 0,
            "sentiment_breakdown": [],
            "top_complaints": [],
            "topic_distribution": [],
            "urgency_breakdown": [],
            "sentiment_trend": [],
            "executive_summary": {
                "overview": "No customer feedback found in database. Ingest reviews via Paste, CSV upload, or click 'Load Sample Data' to view analytics.",
                "major_problems": [],
                "actionable_recommendations": [],
                "critical_alerts": [],
                "provider": "none"
            }
        }

    # 1. Rating & NPS calculations
    ratings = [r.rating for r in all_reviews if r.rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    # NPS Estimate: Promoters (rating 4-5 or Positive), Detractors (rating 1-2 or Negative)
    promoters = sum(1 for r in all_reviews if (r.rating and r.rating >= 4) or r.sentiment == "Positive")
    detractors = sum(1 for r in all_reviews if (r.rating and r.rating <= 2) or r.sentiment == "Negative")
    nps_estimate = round(((promoters - detractors) / total) * 100, 1)

    # 2. Sentiment Breakdown
    sent_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for r in all_reviews:
        sent_counts[r.sentiment] = sent_counts.get(r.sentiment, 0) + 1

    pos_pct = round((sent_counts["Positive"] / total) * 100, 1)
    neg_pct = round((sent_counts["Negative"] / total) * 100, 1)
    neu_pct = round((sent_counts["Neutral"] / total) * 100, 1)

    sentiment_breakdown = [
        {"sentiment": s, "count": count, "percentage": round((count / total) * 100, 1)}
        for s, count in sent_counts.items()
    ]

    # 3. Urgency Breakdown
    urg_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for r in all_reviews:
        urg_counts[r.urgency] = urg_counts.get(r.urgency, 0) + 1

    urgency_breakdown = [
        {"urgency": u, "count": count, "percentage": round((count / total) * 100, 1)}
        for u, count in urg_counts.items()
    ]

    # 4. Topic distribution and complaints
    topic_data: Dict[str, Dict[str, int]] = {}
    for r in all_reviews:
        t = r.topic
        if t not in topic_data:
            topic_data[t] = {"total": 0, "Positive": 0, "Neutral": 0, "Negative": 0}
        topic_data[t]["total"] += 1
        topic_data[t][r.sentiment] = topic_data[t].get(r.sentiment, 0) + 1

    topic_distribution = [
        {
            "topic": t,
            "total": d["total"],
            "positive": d["Positive"],
            "neutral": d["Neutral"],
            "negative": d["Negative"],
            "percentage": round((d["total"] / total) * 100, 1)
        }
        for t, d in sorted(topic_data.items(), key=lambda x: x[1]["total"], reverse=True)
    ]

    # Top complaints = topics with highest negative counts
    top_complaints = [
        {
            "topic": t,
            "total": d["total"],
            "positive": d["Positive"],
            "neutral": d["Neutral"],
            "negative": d["Negative"],
            "percentage": round((d["Negative"] / max(1, sent_counts["Negative"])) * 100, 1)
        }
        for t, d in sorted(topic_data.items(), key=lambda x: x[1]["Negative"], reverse=True)
        if d["Negative"] > 0
    ]

    # 5. Sentiment Trend Line over time (bucketed by date YYYY-MM-DD)
    date_buckets: Dict[str, Dict[str, Any]] = {}
    for r in all_reviews:
        d_str = r.review_date.strftime("%Y-%m-%d") if r.review_date else datetime.utcnow().strftime("%Y-%m-%d")
        if d_str not in date_buckets:
            date_buckets[d_str] = {"positive": 0, "neutral": 0, "negative": 0, "scores": [], "total": 0}
        
        date_buckets[d_str]["total"] += 1
        date_buckets[d_str]["scores"].append(r.sentiment_score)
        if r.sentiment == "Positive":
            date_buckets[d_str]["positive"] += 1
        elif r.sentiment == "Negative":
            date_buckets[d_str]["negative"] += 1
        else:
            date_buckets[d_str]["neutral"] += 1

    sorted_dates = sorted(date_buckets.keys())
    sentiment_trend = [
        {
            "date": d,
            "positive": date_buckets[d]["positive"],
            "neutral": date_buckets[d]["neutral"],
            "negative": date_buckets[d]["negative"],
            "avg_score": round(sum(date_buckets[d]["scores"]) / max(1, len(date_buckets[d]["scores"])), 3),
            "total": date_buckets[d]["total"]
        }
        for d in sorted_dates
    ]

    # 6. AI-Generated Executive Summary
    user_key = current_user.claude_api_key if current_user else None
    reviews_dicts = [
        {
            "text": r.text,
            "rating": r.rating,
            "sentiment": r.sentiment,
            "topic": r.topic,
            "urgency": r.urgency
        }
        for r in all_reviews
    ]
    summary_data = await generate_executive_summary(reviews_dicts, user_api_key=user_key)

    return {
        "total_reviews": total,
        "avg_rating": avg_rating,
        "nps_estimate": nps_estimate,
        "positive_percentage": pos_pct,
        "negative_percentage": neg_pct,
        "neutral_percentage": neu_pct,
        "critical_count": urg_counts["Critical"],
        "high_urgency_count": urg_counts["High"],
        "sentiment_breakdown": sentiment_breakdown,
        "top_complaints": top_complaints,
        "topic_distribution": topic_distribution,
        "urgency_breakdown": urgency_breakdown,
        "sentiment_trend": sentiment_trend,
        "executive_summary": summary_data
    }


# ==========================================
# EXPORT ROUTES
# ==========================================

@app.get("/api/export/csv")
def export_csv(
    sentiment: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Review)
    if current_user:
        query = query.filter((Review.user_id == current_user.id) | (Review.user_id == None))
    
    if sentiment:
        query = query.filter(Review.sentiment.ilike(sentiment))
    if topic:
        query = query.filter(Review.topic.ilike(topic))
    if urgency:
        query = query.filter(Review.urgency.ilike(urgency))

    reviews = query.order_by(desc(Review.review_date)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Date", "Customer Name", "Rating", "Sentiment",
        "Sentiment Score", "Topic", "Urgency", "AI Summary", "Analysis Engine", "Review Text"
    ])

    for r in reviews:
        writer.writerow([
            r.id,
            r.review_date.strftime("%Y-%m-%d %H:%M:%S") if r.review_date else "",
            r.customer_name or "Anonymous",
            r.rating or "",
            r.sentiment,
            r.sentiment_score,
            r.topic,
            r.urgency,
            r.ai_summary or "",
            r.analysis_provider,
            r.text
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=feedback_analysis_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


# ==========================================
# STATIC FRONTEND SERVING
# ==========================================

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist) and not os.getenv("VERCEL"):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Do not catch API routes
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

