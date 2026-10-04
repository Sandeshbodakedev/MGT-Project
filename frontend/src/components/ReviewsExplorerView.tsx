import React, { useState } from 'react';
import { Review, FilterState, PaginatedReviews } from '../types';
import { apiDeleteReview, apiClearAllReviews, getExportCSVUrl } from '../api/client';
import {
  Search, Filter, Trash2, Download, RefreshCw, Star,
  AlertTriangle, ShieldAlert, CheckCircle, Clock, LayoutGrid,
  List, ChevronLeft, ChevronRight, X, ExternalLink, Cpu, Sparkles
} from 'lucide-react';

interface ReviewsExplorerViewProps {
  data: PaginatedReviews | null;
  loading: boolean;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onRefresh: () => void;
}

const TOPICS = [
  'All Topics',
  'Delivery',
  'Quality',
  'Pricing',
  'Customer Service',
  'Usability',
  'Features',
  'Billing',
  'General'
];

export const ReviewsExplorerView: React.FC<ReviewsExplorerViewProps> = ({
  data,
  loading,
  filters,
  onFilterChange,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value, page: 1 });
  };

  const handleSentimentFilter = (sentiment: string) => {
    onFilterChange({ ...filters, sentiment: sentiment === 'All' ? '' : sentiment, page: 1 });
  };

  const handleTopicFilter = (topic: string) => {
    onFilterChange({ ...filters, topic: topic === 'All Topics' ? '' : topic, page: 1 });
  };

  const handleUrgencyFilter = (urgency: string) => {
    onFilterChange({ ...filters, urgency: urgency === 'All' ? '' : urgency, page: 1 });
  };

  const handleSortChange = (sortBy: FilterState['sort_by']) => {
    const isSame = filters.sort_by === sortBy;
    const sortOrder = isSame && filters.sort_order === 'desc' ? 'asc' : 'desc';
    onFilterChange({ ...filters, sort_by: sortBy, sort_order: sortOrder });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    setDeletingId(id);
    try {
      await apiDeleteReview(id);
      onRefresh();
      if (selectedReview?.id === id) setSelectedReview(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL customer reviews? This action cannot be undone.')) return;
    try {
      await apiClearAllReviews();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to clear reviews');
    }
  };

  const getSentimentBadge = (sentiment: string, score: number) => {
    if (sentiment === 'Positive') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Positive ({score > 0 ? `+${score}` : score})
        </span>
      );
    }
    if (sentiment === 'Negative') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
          Negative ({score})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
        Neutral ({score})
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <ShieldAlert className="w-3 h-3 mr-1 text-rose-600" />
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-orange-600" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getTopicColor = (topic: string) => {
    switch (topic) {
      case 'Delivery': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Quality': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Pricing': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Customer Service': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Usability': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Features': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Billing': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-slate-400 text-xs italic">No rating</span>;
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const totalReviews = data?.total || 0;
  const items = data?.items || [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Filter & Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Row 1: Search + View Toggles + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search feedback by keywords, customer name, issue..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '', page: 1 })}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export CSV */}
            <a
              href={getExportCSVUrl(filters)}
              download
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>

            {/* Clear All */}
            {totalReviews > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                title="Clear all reviews"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Row 2: Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-2">
            <Filter className="w-3 h-3" />
            <span>Filter By:</span>
          </div>

          {/* Sentiment Filter */}
          {['All', 'Positive', 'Neutral', 'Negative'].map((sent) => (
            <button
              key={sent}
              onClick={() => handleSentimentFilter(sent)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                (filters.sentiment === sent) || (sent === 'All' && !filters.sentiment)
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sent}
            </button>
          ))}

          <span className="text-slate-300">|</span>

          {/* Urgency Filter */}
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((urg) => (
            <button
              key={urg}
              onClick={() => handleUrgencyFilter(urg)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                (filters.urgency === urg) || (urg === 'All' && !filters.urgency)
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {urg === 'All' ? 'All Urgencies' : urg}
            </button>
          ))}

          <span className="text-slate-300">|</span>

          {/* Topic Dropdown */}
          <select
            value={filters.topic || 'All Topics'}
            onChange={(e) => handleTopicFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg font-semibold bg-slate-100 text-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-xs"
          >
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>

          {/* Sorting controls */}
          <div className="ml-auto flex items-center space-x-1 text-slate-500 text-[11px]">
            <span>Sort:</span>
            <button
              onClick={() => handleSortChange('date')}
              className={`px-1.5 py-0.5 rounded font-semibold ${filters.sort_by === 'date' ? 'text-indigo-600 bg-indigo-50' : ''}`}
            >
              Date {filters.sort_by === 'date' ? (filters.sort_order === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => handleSortChange('rating')}
              className={`px-1.5 py-0.5 rounded font-semibold ${filters.sort_by === 'rating' ? 'text-indigo-600 bg-indigo-50' : ''}`}
            >
              Rating {filters.sort_by === 'rating' ? (filters.sort_order === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => handleSortChange('urgency')}
              className={`px-1.5 py-0.5 rounded font-semibold ${filters.sort_by === 'urgency' ? 'text-indigo-600 bg-indigo-50' : ''}`}
            >
              Urgency {filters.sort_by === 'urgency' ? (filters.sort_order === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>

        </div>

      </div>

      {/* Review Count Info */}
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>Showing {items.length} of {totalReviews} feedback records</span>
        {(filters.search || filters.sentiment || filters.topic || filters.urgency) && (
          <button
            onClick={() => onFilterChange({ ...filters, search: '', sentiment: '', topic: '', urgency: '', page: 1 })}
            className="text-indigo-600 hover:underline font-semibold"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Content Rendering: Card View vs Table View */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <p className="text-sm font-semibold text-slate-600">No customer reviews match your active filter criteria.</p>
          <button
            onClick={() => onFilterChange({ ...filters, search: '', sentiment: '', topic: '', urgency: '', page: 1 })}
            className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                review.urgency === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                
                {/* Header: Customer + Date + Delete */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{review.customer_name || 'Anonymous Customer'}</div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{review.review_date ? new Date(review.review_date).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {renderStars(review.rating)}
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="p-1 text-slate-300 hover:text-rose-600 transition-colors rounded"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{review.text}"
                </p>

                {/* AI Summary / Snippet */}
                {review.ai_summary && (
                  <div className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-start space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span className="leading-tight">{review.ai_summary}</span>
                  </div>
                )}

              </div>

              {/* Footer: Tags & Badges */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  {getSentimentBadge(review.sentiment, review.sentiment_score)}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTopicColor(review.topic)}`}>
                    {review.topic}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {getUrgencyBadge(review.urgency)}
                  <span className="text-[10px] text-slate-400 uppercase font-mono" title={`Analyzed by ${review.analysis_provider}`}>
                    {review.analysis_provider === 'claude' ? 'Claude 3.5' : 'AI Verified'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3.5 text-left">Customer</th>
                  <th className="p-3.5 text-left">Feedback Text</th>
                  <th className="p-3.5 text-left">Rating</th>
                  <th className="p-3.5 text-left">Sentiment</th>
                  <th className="p-3.5 text-left">Topic</th>
                  <th className="p-3.5 text-left">Urgency</th>
                  <th className="p-3.5 text-left">Date</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((review) => (
                  <tr key={review.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                      {review.customer_name || 'Anonymous'}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-sm">
                      <div className="line-clamp-2">{review.text}</div>
                      {review.ai_summary && (
                        <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">{review.ai_summary}</div>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">{renderStars(review.rating)}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      {getSentimentBadge(review.sentiment, review.sentiment_score)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTopicColor(review.topic)}`}>
                        {review.topic}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">{getUrgencyBadge(review.urgency)}</td>
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {review.review_date ? new Date(review.review_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200">
          <button
            onClick={() => onFilterChange({ ...filters, page: Math.max(1, filters.page - 1) })}
            disabled={filters.page <= 1}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold text-slate-600">
            Page {filters.page} of {data.total_pages}
          </span>

          <button
            onClick={() => onFilterChange({ ...filters, page: Math.min(data.total_pages, filters.page + 1) })}
            disabled={filters.page >= data.total_pages}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
