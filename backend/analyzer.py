import os
import json
import logging
import re
from typing import List, Dict, Any, Optional
import httpx
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

# Initialize VADER analyzer
vader_analyzer = SentimentIntensityAnalyzer()

TOPIC_KEYWORDS = {
    "Delivery": [
        "shipping", "delivery", "delay", "delayed", "late", "package", "arrive",
        "arrived", "tracking", "courier", "transit", "carrier", "lost", "box",
        "dispatch", "postage", "fedex", "ups", "dhl", "usps", "customs"
    ],
    "Quality": [
        "quality", "broken", "broke", "defect", "defective", "material", "durable",
        "durability", "cheap", "fell apart", "crack", "cracked", "sturdy", "poor build",
        "tear", "tore", "flimsy", "damaged", "scratched", "malfunction", "stopped working"
    ],
    "Pricing": [
        "price", "expensive", "cost", "overpriced", "worth", "money", "cheap",
        "refund", "discount", "fee", "charged", "rip off", "rip-off", "hidden fee",
        "overcharge", "value", "payment", "affordable", "pricey"
    ],
    "Customer Service": [
        "service", "support", "agent", "representative", "rude", "polite", "helpful",
        "unhelpful", "response", "ticket", "email", "phone", "call", "chat",
        "ignored", "wait time", "hold", "attitude", "staff", "customer care"
    ],
    "Usability": [
        "usable", "usability", "interface", "app", "website", "bug", "crash",
        "crashed", "slow", "lag", "confusing", "hard to use", "easy to use",
        "intuitive", "login", "password", "glitch", "error", "navigation", "ui", "ux"
    ],
    "Features": [
        "feature", "features", "missing", "wish it had", "option", "setting",
        "capability", "functionality", "update", "integration", "sync", "tool",
        "customization"
    ],
    "Billing": [
        "billing", "subscription", "cancel", "canceled", "charged twice",
        "invoice", "credit card", "unauthorized", "auto-renew", "renew", "receipt"
    ]
}

CRITICAL_KEYWORDS = [
    "lawyer", "legal", "sue", "lawsuit", "attorney", "fraud", "scam", "scammer",
    "scammers", "police", "stolen", "danger", "dangerous", "hazard", "injury",
    "hospital", "fire", "poison", "breach", "report to ftc", "unauthorized charge",
    "safety hazard"
]

HIGH_KEYWORDS = [
    "terrible", "horrible", "furious", "unacceptable", "disaster", "escalate",
    "worst", "disgusting", "never again", "waste of money", "immediately refund",
    "completely broken", "urgent", "unusable", "outrageous"
]

MEDIUM_KEYWORDS = [
    "disappointed", "annoying", "delay", "slow", "issue", "problem", "glitch",
    "inconvenient", "average", "mediocre", "could be better", "frustrating"
]


def analyze_with_vader_and_keywords(text: str, rating: Optional[float] = None) -> Dict[str, Any]:
    """
    Fallback deterministic NLP engine using VADER + Keyword heuristic.
    """
    # 1. Sentiment analysis
    scores = vader_analyzer.polarity_scores(text)
    compound = scores["compound"]

    # Adjust compound score slightly if rating is provided
    if rating is not None:
        if rating <= 2 and compound > -0.2:
            compound = min(compound - 0.35, -0.15)
        elif rating >= 4 and compound < 0.2:
            compound = max(compound + 0.35, 0.2)

    if compound >= 0.05:
        sentiment = "Positive"
    elif compound <= -0.05:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"

    # 2. Topic classification
    text_lower = text.lower()
    topic_scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
        if score > 0:
            topic_scores[topic] = score

    if topic_scores:
        detected_topic = max(topic_scores, key=topic_scores.get)
    else:
        detected_topic = "General"

    # 3. Urgency classification
    has_critical = any(re.search(r'\b' + re.escape(kw) + r'\b', text_lower) for kw in CRITICAL_KEYWORDS)
    has_high = any(re.search(r'\b' + re.escape(kw) + r'\b', text_lower) for kw in HIGH_KEYWORDS)
    has_medium = any(re.search(r'\b' + re.escape(kw) + r'\b', text_lower) for kw in MEDIUM_KEYWORDS)

    if has_critical:
        urgency = "Critical"
    elif has_high or (sentiment == "Negative" and compound <= -0.5):
        urgency = "High"
    elif has_medium or sentiment == "Negative" or (rating is not None and rating <= 2):
        urgency = "Medium"
    else:
        urgency = "Low"

    # 4. Short AI summary snippet
    snippet = text.strip()
    if len(snippet) > 90:
        snippet = snippet[:87] + "..."

    summary_note = f"{detected_topic} feedback: {snippet}"

    return {
        "sentiment": sentiment,
        "sentiment_score": round(float(compound), 3),
        "topic": detected_topic,
        "urgency": urgency,
        "ai_summary": summary_note,
        "analysis_provider": "vader_keyword"
    }


async def analyze_batch_with_claude(
    texts: List[str],
    ratings: List[Optional[float]],
    api_key: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Calls Anthropic Claude API to analyze a batch of reviews.
    Returns None if the call fails, triggering the fallback engine.
    """
    if not api_key:
        return None

    # Prepare structured input
    items_to_send = []
    for i, (text, r) in enumerate(zip(texts, ratings)):
        items_to_send.append({
            "id": i,
            "text": text,
            "rating": r
        })

    system_prompt = (
        "You are an expert customer feedback analyzer. For each provided customer review, "
        "analyze and return strict JSON containing:\n"
        "- id: integer corresponding to review index\n"
        "- sentiment: exactly 'Positive', 'Neutral', or 'Negative'\n"
        "- sentiment_score: float from -1.0 (very negative) to 1.0 (very positive)\n"
        "- topic: one of ['Delivery', 'Quality', 'Pricing', 'Customer Service', 'Usability', 'Features', 'Billing', 'General']\n"
        "- urgency: exactly 'Low', 'Medium', 'High', or 'Critical'\n"
        "- ai_summary: concise 1-sentence synopsis of the customer's core message\n\n"
        "Return ONLY valid JSON array with no conversational markdown formatting."
    )

    prompt = f"Analyze the following reviews:\n{json.dumps(items_to_send, ensure_ascii=False)}"

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if response.status_code != 200:
                logger.warning(f"Claude API returned status {response.status_code}: {response.text}")
                return None

            data = response.json()
            content_text = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    content_text += block.get("text", "")

            # Extract json array
            match = re.search(r'\[.*\]', content_text, re.DOTALL)
            if match:
                raw_json = match.group(0)
                parsed = json.loads(raw_json)
                results = []
                for item in parsed:
                    results.append({
                        "sentiment": item.get("sentiment", "Neutral"),
                        "sentiment_score": float(item.get("sentiment_score", 0.0)),
                        "topic": item.get("topic", "General"),
                        "urgency": item.get("urgency", "Low"),
                        "ai_summary": item.get("ai_summary", ""),
                        "analysis_provider": "claude"
                    })
                if len(results) == len(texts):
                    return results
    except Exception as e:
        logger.warning(f"Failed to analyze with Claude API: {e}. Falling back to VADER.")

    return None


async def analyze_reviews(
    texts: List[str],
    ratings: List[Optional[float]],
    user_api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Analyzes a batch of reviews using Claude API if key is available,
    otherwise gracefully falls back to VADER + keyword heuristic.
    """
    effective_key = user_api_key or os.getenv("ANTHROPIC_API_KEY")

    if effective_key:
        claude_results = await analyze_batch_with_claude(texts, ratings, effective_key)
        if claude_results:
            return claude_results

    # Fallback to VADER + keyword logic
    return [analyze_with_vader_and_keywords(t, r) for t, r in zip(texts, ratings)]


async def generate_executive_summary(
    reviews: List[Dict[str, Any]],
    user_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates an executive-level summary of major problems and actionable recommendations.
    Uses Claude when available, or a smart statistical synthesis fallback.
    """
    if not reviews:
        return {
            "overview": "No review data available yet. Upload a CSV or paste reviews to generate insights.",
            "major_problems": [],
            "actionable_recommendations": [],
            "critical_alerts": [],
            "provider": "none"
        }

    total = len(reviews)
    neg_reviews = [r for r in reviews if r.get("sentiment") == "Negative"]
    pos_reviews = [r for r in reviews if r.get("sentiment") == "Positive"]
    crit_reviews = [r for r in reviews if r.get("urgency") == "Critical"]
    high_reviews = [r for r in reviews if r.get("urgency") == "High"]

    effective_key = user_api_key or os.getenv("ANTHROPIC_API_KEY")

    if effective_key and total > 0:
        try:
            # Sample sample reviews to keep within token limits
            sample_for_claude = [
                {"sentiment": r.get("sentiment"), "topic": r.get("topic"), "urgency": r.get("urgency"), "text": r.get("text", "")[:200]}
                for r in reviews[:40]
            ]
            
            prompt = (
                f"You are a Chief Customer Officer and AI Analyst. Analyze {total} customer reviews.\n"
                f"Negative count: {len(neg_reviews)}, Positive count: {len(pos_reviews)}, Critical alerts: {len(crit_reviews)}.\n"
                f"Review samples:\n{json.dumps(sample_for_claude, ensure_ascii=False)}\n\n"
                "Return a JSON object with:\n"
                "- overview: high-level strategic executive summary (2-3 sentences)\n"
                "- major_problems: list of top 3 to 5 systemic root issues identified\n"
                "- actionable_recommendations: list of 3 to 5 prioritized, pragmatic business actions\n"
                "- critical_alerts: list of 1 to 3 immediate risks/urgent customer escalations\n"
                "Return strict JSON with keys 'overview', 'major_problems', 'actionable_recommendations', 'critical_alerts'."
            )

            headers = {
                "x-api-key": effective_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}]
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code == 200:
                    text_out = "".join(b.get("text", "") for b in res.json().get("content", []))
                    match = re.search(r'\{.*\}', text_out, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        parsed["provider"] = "claude"
                        return parsed
        except Exception as e:
            logger.warning(f"Claude summary failed: {e}. Falling back to heuristic summary.")

    # Heuristic statistical summary
    topic_complaints: Dict[str, int] = {}
    for r in neg_reviews:
        t = r.get("topic", "General")
        topic_complaints[t] = topic_complaints.get(t, 0) + 1

    sorted_complaints = sorted(topic_complaints.items(), key=lambda x: x[1], reverse=True)
    
    pos_pct = round((len(pos_reviews) / total) * 100, 1)
    neg_pct = round((len(neg_reviews) / total) * 100, 1)

    overview = (
        f"Analyzed {total} customer reviews with {pos_pct}% positive and {neg_pct}% negative sentiment. "
    )
    if sorted_complaints:
        top_topic, top_count = sorted_complaints[0]
        overview += f"The primary operational friction centers on '{top_topic}', contributing to {round(top_count / max(1, len(neg_reviews)) * 100)}% of all registered complaints."
    else:
        overview += "Customer sentiment is overwhelmingly favorable with minimal registered friction."

    major_problems = []
    for topic, count in sorted_complaints[:4]:
        pct = round(count / max(1, len(neg_reviews)) * 100)
        major_problems.append(f"{topic}: {count} complaints ({pct}% of negative feedback). Recurring customer friction detected.")

    if not major_problems and neg_reviews:
        major_problems.append("General dissatisfaction with product features or expectations.")

    recommendations = []
    for topic, _ in sorted_complaints[:3]:
        if topic == "Delivery":
            recommendations.append("Partner with higher-reliability regional couriers and introduce live SMS/email tracking updates.")
        elif topic == "Quality":
            recommendations.append("Initiate QA batch inspection at production checkpoints to address hardware/material vulnerabilities.")
        elif topic == "Pricing":
            recommendations.append("Clarify billing transparency, refund terms, and tier structures to eliminate post-purchase buyer friction.")
        elif topic == "Customer Service":
            recommendations.append("Expand live support coverage and implement automated ticket prioritization for high-urgency escalations.")
        elif topic == "Usability":
            recommendations.append("Conduct UX audit on the user journey and resolve software stability issues / mobile navigation.")
        elif topic == "Billing":
            recommendations.append("Audit recurring subscription renewal notifications and streamline the 1-click cancellation process.")
        else:
            recommendations.append(f"Deploy targeted mitigation plan addressing identified '{topic}' deficiencies.")

    if not recommendations:
        recommendations.append("Maintain high customer delight standards and gather proactive feedback on next-generation features.")

    critical_alerts = []
    for r in crit_reviews[:3]:
        snippet = r.get("text", "")[:120]
        critical_alerts.append(f"Urgent Risk: \"{snippet}...\" (Requires immediate CX outreach)")

    return {
        "overview": overview,
        "major_problems": major_problems,
        "actionable_recommendations": recommendations,
        "critical_alerts": critical_alerts,
        "provider": "vader_statistical"
    }
