import React, { useState, useEffect } from 'react';
import { User, DashboardStats, PaginatedReviews, FilterState } from './types';
import {
  apiGetMe, apiGetDashboard, apiGetReviews, setAuthToken, apiLoadSampleReviews
} from './api/client';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DashboardView } from './components/DashboardView';
import { IngestView } from './components/IngestView';
import { ReviewsExplorerView } from './components/ReviewsExplorerView';
import { ExecutiveReportView } from './components/ExecutiveReportView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingest' | 'explorer' | 'report'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [reviewsData, setReviewsData] = useState<PaginatedReviews | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sentiment: '',
    topic: '',
    urgency: '',
    min_rating: '',
    max_rating: '',
    sort_by: 'date',
    sort_order: 'desc',
    page: 1,
  });

  // Load user session on mount
  useEffect(() => {
    const initUser = async () => {
      const currentUser = await apiGetMe();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    initUser();
  }, []);

  // Fetch Dashboard data
  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await apiGetDashboard();
      setDashboardStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Fetch Reviews list
  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const data = await apiGetReviews(filters);
      setReviewsData(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  useEffect(() => {
    loadReviews();
  }, [filters, user]);

  const handleReviewsImported = async () => {
    await loadDashboard();
    await loadReviews();
  };

  const handleLoadSample = async () => {
    setLoadingDashboard(true);
    try {
      await apiLoadSampleReviews();
      await loadDashboard();
      await loadReviews();
    } catch (err) {
      console.error('Failed to load sample data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    loadDashboard();
    loadReviews();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        onLogout={handleLogout}
        reviewCount={dashboardStats?.total_reviews || 0}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            loading={loadingDashboard}
            onRefresh={loadDashboard}
            onNavigateToIngest={() => setActiveTab('ingest')}
            onLoadSample={handleLoadSample}
            onExportReport={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestView
            onReviewsImported={handleReviewsImported}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'explorer' && (
          <ReviewsExplorerView
            data={reviewsData}
            loading={loadingReviews}
            filters={filters}
            onFilterChange={setFilters}
            onRefresh={() => {
              loadReviews();
              loadDashboard();
            }}
          />
        )}

        {activeTab === 'report' && (
          <ExecutiveReportView
            stats={dashboardStats}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Customer Feedback Analyzer • AI-Powered Review Intelligence</span>
          <span>Powered by Anthropic Claude 3.5 Sonnet & Advanced Feedback Intelligence</span>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          loadDashboard();
          loadReviews();
        }}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        user={user}
        onApiKeyUpdated={(hasKey) => {
          if (user) {
            setUser({ ...user, has_claude_key: hasKey });
          }
          loadDashboard();
        }}
      />
    </div>
  );
};

export default App;
