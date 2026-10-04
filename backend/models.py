import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    claude_api_key = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reviews = relationship("Review", back_populates="owner", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    source_type = Column(String(50), default="paste")  # 'paste', 'csv', 'sample'
    customer_name = Column(String(255), nullable=True)
    text = Column(Text, nullable=False)
    rating = Column(Float, nullable=True)
    review_date = Column(DateTime(timezone=True), default=func.now())
    sentiment = Column(String(50), nullable=False)  # Positive, Neutral, Negative
    sentiment_score = Column(Float, nullable=False, default=0.0)  # -1.0 to 1.0
    topic = Column(String(100), nullable=False, default="General")  # Delivery, Quality, Pricing, Service, etc.
    urgency = Column(String(50), nullable=False, default="Low")  # Low, Medium, High, Critical
    ai_summary = Column(Text, nullable=True)
    analysis_provider = Column(String(50), default="vader_keyword")  # 'claude' or 'vader_keyword'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="reviews")
