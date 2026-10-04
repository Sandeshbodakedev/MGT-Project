from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---

class UserRegister(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    claude_api_key: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None
    has_claude_key: bool = False

    class Config:
        from_attributes = True

class UserApiKeyUpdate(BaseModel):
    claude_api_key: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Review Schemas ---

class ReviewCreate(BaseModel):
    text: str
    customer_name: Optional[str] = None
    rating: Optional[float] = None
    review_date: Optional[datetime] = None

class ReviewBatchPaste(BaseModel):
    # Support either a single multi-line string or a list of items
    raw_text: Optional[str] = None
    items: Optional[List[ReviewCreate]] = None

class ReviewResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    source_type: str
    customer_name: Optional[str] = None
    text: str
    rating: Optional[float] = None
    review_date: Optional[datetime] = None
    sentiment: str
    sentiment_score: float
    topic: str
    urgency: str
    ai_summary: Optional[str] = None
    analysis_provider: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaginatedReviewsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[ReviewResponse]


# --- Analytics & Dashboard Schemas ---

class SentimentCount(BaseModel):
    sentiment: str
    count: int
    percentage: float

class TopicCount(BaseModel):
    topic: str
    total: int
    positive: int
    neutral: int
    negative: int
    percentage: float

class UrgencyCount(BaseModel):
    urgency: str
    count: int
    percentage: float

class TrendPoint(BaseModel):
    date: str
    positive: int
    neutral: int
    negative: int
    avg_score: float
    total: int

class AIExecutiveSummary(BaseModel):
    overview: str
    major_problems: List[str]
    actionable_recommendations: List[str]
    critical_alerts: List[str]
    provider: str

class DashboardStats(BaseModel):
    total_reviews: int
    avg_rating: Optional[float] = None
    nps_estimate: Optional[float] = None
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float
    critical_count: int
    high_urgency_count: int
    sentiment_breakdown: List[SentimentCount]
    top_complaints: List[TopicCount]
    topic_distribution: List[TopicCount]
    urgency_breakdown: List[UrgencyCount]
    sentiment_trend: List[TrendPoint]
    executive_summary: AIExecutiveSummary
