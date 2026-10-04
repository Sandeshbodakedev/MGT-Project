export interface User {
  id: number;
  email: string;
  full_name?: string;
  created_at?: string;
  has_claude_key: boolean;
}

export interface Review {
  id: number;
  user_id?: number;
  source_type: 'paste' | 'csv' | 'sample';
  customer_name?: string;
  text: string;
  rating?: number;
  review_date?: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  sentiment_score: number;
  topic: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  ai_summary?: string;
  analysis_provider: string;
  created_at?: string;
}

export interface SentimentCount {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  count: number;
  percentage: number;
}

export interface TopicCount {
  topic: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  percentage: number;
}

export interface UrgencyCount {
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  count: number;
  percentage: number;
}

export interface TrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  avg_score: number;
  total: number;
}

export interface AIExecutiveSummary {
  overview: string;
  major_problems: string[];
  actionable_recommendations: string[];
  critical_alerts: string[];
  provider: string;
}

export interface DashboardStats {
  total_reviews: number;
  avg_rating?: number;
  nps_estimate?: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  critical_count: number;
  high_urgency_count: number;
  sentiment_breakdown: SentimentCount[];
  top_complaints: TopicCount[];
  topic_distribution: TopicCount[];
  urgency_breakdown: UrgencyCount[];
  sentiment_trend: TrendPoint[];
  executive_summary: AIExecutiveSummary;
}

export interface PaginatedReviews {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Review[];
}

export interface FilterState {
  search: string;
  sentiment: string;
  topic: string;
  urgency: string;
  min_rating: string;
  max_rating: string;
  sort_by: 'date' | 'rating' | 'urgency' | 'sentiment';
  sort_order: 'asc' | 'desc';
  page: number;
}
