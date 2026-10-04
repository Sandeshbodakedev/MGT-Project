import React from 'react';
import { DashboardStats } from '../types';
import { Printer, Download, ArrowLeft, Sparkles, AlertTriangle, Lightbulb, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getExportCSVUrl } from '../api/client';

interface ExecutiveReportViewProps {
  stats: DashboardStats | null;
  onBackToDashboard: () => void;
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  stats,
  onBackToDashboard
}) => {
  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center bg-white p-8 rounded-3xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">No Data for Report</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">Please ingest reviews first to generate an executive report.</p>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
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
    top_complaints,
    executive_summary
  } = stats;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Action Bar (hidden during print) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <button
          onClick={onBackToDashboard}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2">
          <a
            href={getExportCSVUrl()}
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Data</span>
          </a>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Executive Report Document */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 space-y-8 text-slate-900">
        
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 font-black text-xl tracking-tight">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Sentix AI Intelligence</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Customer Feedback Executive Audit</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive sentiment diagnostics, operational friction, and prioritized actions
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <div><strong>Report Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><strong>Dataset Size:</strong> {total_reviews} verified reviews</div>
            <div><strong>AI Engine:</strong> {executive_summary.provider === 'claude' ? 'Claude 3.5 Sonnet' : 'Claude AI & Sentiment Intelligence'}</div>
          </div>
        </div>

        {/* Section 1: Executive Metrics Summary Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            1. Core Sentiment & Satisfaction Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Reviews Analyzed</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{total_reviews}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 block">Favorable Sentiment</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{positive_percentage}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-800 block">Negative Complaints</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">{negative_percentage}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <span className="text-[11px] font-semibold text-indigo-800 block">Est. Net Promoter Score</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">
                {nps_estimate !== null && nps_estimate !== undefined ? `${nps_estimate > 0 ? '+' : ''}${nps_estimate}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Executive Synthesis */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            2. Executive Strategic Overview
          </h2>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 leading-relaxed text-xs text-slate-700">
            {executive_summary.overview}
          </div>
        </div>

        {/* Section 3: Root Cause & Complaint Drivers */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>3. Major Operational Friction Points</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {executive_summary.major_problems.map((problem, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-xs">
                <div className="font-bold text-rose-900 mb-1">Issue #{idx + 1}</div>
                <div className="text-rose-800 leading-relaxed">{problem}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Top Complaint Categories Breakdown */}
        {top_complaints && top_complaints.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              4. Category Complaint Volume Breakdown
            </h2>
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-center">Total Volume</th>
                    <th className="p-3 text-center">Positive</th>
                    <th className="p-3 text-center">Negative Mentions</th>
                    <th className="p-3 text-right">% of All Complaints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top_complaints.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{item.topic}</td>
                      <td className="p-3 text-center text-slate-600">{item.total}</td>
                      <td className="p-3 text-center text-emerald-600 font-semibold">{item.positive}</td>
                      <td className="p-3 text-center text-rose-600 font-bold">{item.negative}</td>
                      <td className="p-3 text-right text-slate-700 font-mono">{item.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 5: Prioritized Action Plan */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-emerald-600" />
            <span>5. Recommended Action Plan & Next Steps</span>
          </h2>
          <div className="space-y-2.5">
            {executive_summary.actionable_recommendations.map((rec, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 mr-1.5">Action #{idx + 1}:</span>
                  <span className="text-emerald-900 leading-relaxed">{rec}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Critical Escalation Watchlist */}
        {executive_summary.critical_alerts && executive_summary.critical_alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>6. High Priority Escalations (Immediate Action Required)</span>
            </h2>
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
              {executive_summary.critical_alerts.map((alert, idx) => (
                <div key={idx} className="text-xs text-rose-900 font-mono">
                  • {alert}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signoff Footer */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400">
          <span>Generated by Customer Feedback Analyzer • Sentix AI Platform</span>
          <span>Confidential • Internal Business Strategy Document</span>
        </div>

      </div>

    </div>
  );
};
