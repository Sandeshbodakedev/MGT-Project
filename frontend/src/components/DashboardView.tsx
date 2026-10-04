import React from 'react';
import { DashboardStats } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import {
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, MessageSquare,
  Star, ShieldAlert, ArrowUpRight, ArrowDownRight, Lightbulb,
  FileSpreadsheet, Upload, RefreshCw
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToIngest: () => void;
  onLoadSample: () => void;
  onExportReport: () => void;
}

const SENTIMENT_COLORS = {
  Positive: '#10b981', // Emerald 500
  Neutral: '#f59e0b',  // Amber 500
  Negative: '#ef4444', // Rose 500
};

const URGENCY_COLORS: Record<string, string> = {
  Critical: '#dc2626', // Red 600
  High: '#ea580c',     // Orange 600
  Medium: '#f59e0b',   // Amber 500
  Low: '#10b981',      // Emerald 500
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onNavigateToIngest,
  onLoadSample,
  onExportReport
}) => {
  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Analyzing feedback data & compiling intelligence...</p>
      </div>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">No Customer Reviews Yet</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
            Upload a CSV file of customer reviews, paste feedback text, or load our realistic pre-built sample dataset to experience the AI analytics engine.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={onLoadSample}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 flex items-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load 19 Sample Reviews (Instant Demo)</span>
            </button>
            <button
              onClick={onNavigateToIngest}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center space-x-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Paste or Upload CSV</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    total_reviews,
    avg_rating,
    nps_estimate,
    positive_percentage,
    negative_percentage,
    neutral_percentage,
    critical_count,
    high_urgency_count,
    sentiment_breakdown,
    top_complaints,
    urgency_breakdown,
    sentiment_trend,
    executive_summary
  } = stats;

  const pieData = sentiment_breakdown.map((item) => ({
    name: item.sentiment,
    value: item.count,
    percentage: item.percentage,
    color: SENTIMENT_COLORS[item.sentiment] || '#94a3b8'
  }));

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Executive Feedback Intelligence</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated from {total_reviews} customer reviews across sentiment, topics, and urgency vectors.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onNavigateToIngest}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Reviews</span>
          </button>

          <button
            onClick={onExportReport}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generate Executive Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Card 1: Total Reviews */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Reviews</span>
            <MessageSquare className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{total_reviews}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <span>In database</span>
          </div>
        </div>

        {/* Card 2: Positive Sentiment */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold">Positive</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{positive_percentage}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {sentiment_breakdown.find(s => s.sentiment === 'Positive')?.count || 0} reviews
          </div>
        </div>

        {/* Card 3: Negative Sentiment */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">Negative</span>
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600">{negative_percentage}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {sentiment_breakdown.find(s => s.sentiment === 'Negative')?.count || 0} complaints
          </div>
        </div>

        {/* Card 4: Average Rating */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold">Avg Rating</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {avg_rating !== null ? `${avg_rating} / 5` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {avg_rating && avg_rating >= 4 ? 'Good satisfaction' : 'Needs attention'}
          </div>
        </div>

        {/* Card 5: Net Sentiment / NPS Estimate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold">Est. NPS</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black ${
            (nps_estimate || 0) >= 20 ? 'text-emerald-600' : (nps_estimate || 0) >= 0 ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {nps_estimate !== null && nps_estimate !== undefined ? `${nps_estimate > 0 ? '+' : ''}${nps_estimate}` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {(nps_estimate || 0) >= 30 ? 'High loyalty' : 'At risk'}
          </div>
        </div>

        {/* Card 6: Critical Alerts */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          critical_count > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">Critical Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{critical_count}</div>
          <div className="text-[11px] text-rose-800 font-medium mt-1">
            {critical_count > 0 ? 'Requires immediate action' : 'No severe threats'}
          </div>
        </div>

      </div>

      {/* AI Executive Summary Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white">AI Executive Diagnostic & Summary</h3>
                <span className="text-[11px] text-indigo-300">
                  Powered by {executive_summary?.provider === 'claude' ? 'Claude 3.5 Sonnet' : 'Claude AI & Sentiment Intelligence Engine'}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Automated Synthesis
            </span>
          </div>

          {/* Overview text */}
          <p className="text-sm text-slate-200 leading-relaxed font-normal bg-white/5 p-4 rounded-2xl border border-white/10">
            {executive_summary?.overview}
          </p>

          {/* Grid: Major Problems & Actionable Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            
            {/* Major Problems */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs uppercase tracking-wider mb-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Identified Friction & Bottlenecks</span>
              </div>
              <ul className="space-y-2">
                {executive_summary?.major_problems && executive_summary.major_problems.length > 0 ? (
                  executive_summary.major_problems.map((prob, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{prob}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">No recurring bottlenecks detected.</li>
                )}
              </ul>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                <span>Actionable Strategic Recommendations</span>
              </div>
              <ul className="space-y-2">
                {executive_summary?.actionable_recommendations && executive_summary.actionable_recommendations.length > 0 ? (
                  executive_summary.actionable_recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">Continue tracking customer sentiment.</li>
                )}
              </ul>
            </div>

          </div>

          {/* Critical Alerts Banner if any */}
          {executive_summary?.critical_alerts && executive_summary.critical_alerts.length > 0 && (
            <div className="mt-4 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs mb-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Urgent Customer Escalations</span>
              </div>
              <div className="space-y-1">
                {executive_summary.critical_alerts.map((alert, idx) => (
                  <p key={idx} className="text-xs text-rose-200 italic font-mono bg-rose-900/30 p-2 rounded-lg">
                    {alert}
                  </p>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Main Charts Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Sentiment Pie / Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sentiment Distribution</h3>
              <p className="text-xs text-slate-500">Overall positive, neutral, and negative ratio</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Positive ({positive_percentage}%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Neutral ({neutral_percentage}%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Negative ({negative_percentage}%)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value} reviews (${item.payload.percentage}%)`,
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-xl bg-emerald-50">
              <div className="text-xs text-emerald-800 font-semibold">Positive</div>
              <div className="text-lg font-bold text-emerald-700">
                {sentiment_breakdown.find(s => s.sentiment === 'Positive')?.count || 0}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-amber-50">
              <div className="text-xs text-amber-800 font-semibold">Neutral</div>
              <div className="text-lg font-bold text-amber-700">
                {sentiment_breakdown.find(s => s.sentiment === 'Neutral')?.count || 0}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50">
              <div className="text-xs text-rose-800 font-semibold">Negative</div>
              <div className="text-lg font-bold text-rose-700">
                {sentiment_breakdown.find(s => s.sentiment === 'Negative')?.count || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Complaints Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top Complaint Categories</h3>
              <p className="text-xs text-slate-500">Topics with the highest negative customer feedback</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {top_complaints && top_complaints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top_complaints}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis dataKey="topic" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={80} />
                  <RechartsTooltip
                    formatter={(val: any) => [`${val} complaints`, 'Volume']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="negative" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No negative feedback registered yet!
              </div>
            )}
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Primary friction area: <strong className="text-slate-800">{top_complaints[0]?.topic || 'None'}</strong></span>
            <span>{top_complaints[0]?.negative || 0} negative mentions</span>
          </div>
        </div>

        {/* Chart 3: Sentiment Trend Over Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sentiment Timeline Trend</h3>
              <p className="text-xs text-slate-500">Daily volume of positive vs negative feedback</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Positive</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-600">Negative</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {sentiment_trend && sentiment_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sentiment_trend}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" />
                  <Area type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Not enough date records to build timeline trend.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Urgency Level Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Urgency & Escalation Levels</h3>
                <p className="text-xs text-slate-500">Customer feedback prioritized by severity</p>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                {critical_count + high_urgency_count} High Priority
              </span>
            </div>

            <div className="space-y-3.5 mt-5">
              {urgency_breakdown.map((item) => (
                <div key={item.urgency} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: URGENCY_COLORS[item.urgency] }}
                      />
                      <span>{item.urgency} Urgency</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      {item.count} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: URGENCY_COLORS[item.urgency]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
            <strong>Urgency Logic:</strong> Flagged automatically based on safety risks, legal threats, billing discrepancies, extreme sentiment compound, and 1-star ratings.
          </div>
        </div>

      </div>

    </div>
  );
};
