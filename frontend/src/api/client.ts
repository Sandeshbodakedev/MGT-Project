import { User, Review, DashboardStats, PaginatedReviews, FilterState } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('cfa_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('cfa_auth_token', token);
  } else {
    localStorage.removeItem('cfa_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorMsg = response.statusText || `Request failed with code ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Authentication
export async function apiRegister(payload: { email: string; password: string; full_name?: string; claude_api_key?: string }) {
  const data = await request<{ access_token: string; token_type: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token);
  return data;
}

export async function apiLogin(payload: { email: string; password: string }) {
  const data = await request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token);
  return data;
}

export async function apiGetMe(): Promise<User | null> {
  if (!getAuthToken()) return null;
  try {
    return await request<User>('/auth/me');
  } catch {
    setAuthToken(null);
    return null;
  }
}

export async function apiUpdateApiKey(claude_api_key: string) {
  return request<{ message: string; has_claude_key: boolean }>('/auth/api-key', {
    method: 'PUT',
    body: JSON.stringify({ claude_api_key }),
  });
}

// Analytics & Dashboard
export async function apiGetDashboard(): Promise<DashboardStats> {
  return request<DashboardStats>('/analytics/dashboard');
}

// Reviews Explorer & Filtering
export async function apiGetReviews(filters: FilterState): Promise<PaginatedReviews> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.sentiment) params.append('sentiment', filters.sentiment);
  if (filters.topic) params.append('topic', filters.topic);
  if (filters.urgency) params.append('urgency', filters.urgency);
  if (filters.min_rating) params.append('min_rating', filters.min_rating);
  if (filters.max_rating) params.append('max_rating', filters.max_rating);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.sort_order) params.append('sort_order', filters.sort_order);
  params.append('page', filters.page.toString());
  params.append('page_size', '12');

  return request<PaginatedReviews>(`/reviews?${params.toString()}`);
}

// Ingestion
export async function apiPasteReviews(raw_text: string): Promise<Review[]> {
  return request<Review[]>('/reviews/paste', {
    method: 'POST',
    body: JSON.stringify({ raw_text }),
  });
}

export async function apiUploadCSV(file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ message: string; count: number }>('/reviews/upload-csv', {
    method: 'POST',
    body: formData,
  });
}

export async function apiLoadSampleReviews(): Promise<{ message: string }> {
  return request<{ message: string }>('/reviews/load-sample', {
    method: 'POST',
  });
}

export async function apiDeleteReview(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/reviews/${id}`, {
    method: 'DELETE',
  });
}

export async function apiClearAllReviews(): Promise<{ message: string }> {
  return request<{ message: string }>('/reviews', {
    method: 'DELETE',
  });
}

export function getExportCSVUrl(filters?: Partial<FilterState>): string {
  const params = new URLSearchParams();
  if (filters?.sentiment) params.append('sentiment', filters.sentiment);
  if (filters?.topic) params.append('topic', filters.topic);
  if (filters?.urgency) params.append('urgency', filters.urgency);
  return `${API_BASE}/export/csv?${params.toString()}`;
}
