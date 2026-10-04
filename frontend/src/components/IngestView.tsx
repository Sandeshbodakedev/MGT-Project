import React, { useState, useRef } from 'react';
import { apiPasteReviews, apiUploadCSV, apiLoadSampleReviews } from '../api/client';
import {
  UploadCloud, ClipboardEdit, Sparkles, FileSpreadsheet, CheckCircle,
  AlertCircle, Download, ArrowRight, Loader2, Info
} from 'lucide-react';

interface IngestViewProps {
  onReviewsImported: () => void;
  onNavigateToDashboard: () => void;
}

export const IngestView: React.FC<IngestViewProps> = ({
  onReviewsImported,
  onNavigateToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; count?: number } | null>(null);

  // CSV Drag and drop / file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate review count in paste textarea
  const estimatedReviewsCount = pasteText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5).length;

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const results = await apiPasteReviews(pasteText);
      setStatusMessage({
        type: 'success',
        text: `Successfully analyzed and saved ${results.length} reviews!`,
        count: results.length
      });
      setPasteText('');
      onReviewsImported();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to analyze reviews. Please check your text input.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid .csv file' });
      return;
    }
    setSelectedFile(file);
    setStatusMessage(null);

    // Read preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
        const rows = lines.map(line => {
          // simple csv split for preview
          return line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
        });
        setCsvPreview(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiUploadCSV(selectedFile);
      setStatusMessage({
        type: 'success',
        text: res.message,
        count: res.count
      });
      setSelectedFile(null);
      setCsvPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onReviewsImported();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to upload and parse CSV.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiLoadSampleReviews();
      setStatusMessage({
        type: 'success',
        text: res.message
      });
      onReviewsImported();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to load sample dataset.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = `Customer Name,Review Text,Rating,Date
Marcus Vance,"The delivery took over two weeks to arrive and the box was completely crushed. Inside, the screen was cracked! Completely unacceptable service.",1,2026-09-16
Elena Rostova,"Absolutely love the new software interface! It is lightning fast, intuitive, and saves our team hours every week. Keep up the great work!",5,2026-09-17
David Sterling,"I was charged twice on my credit card without my authorization. If this unauthorized transaction isn't refunded immediately, I am contacting my lawyer and reporting fraud to the FTC.",1,2026-09-18
Sarah Jenkins,"The price increased by 40% this year with almost zero new features. Feels like a total rip-off for loyal customers. Might switch to competitors.",2,2026-09-19
Michael Chang,"Customer service was phenomenal! Rep Sarah resolved my account issue in less than 3 minutes with great courtesy and care.",5,2026-09-20`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_customer_reviews.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Review Intake & AI Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Feed raw feedback to trigger automated sentiment analysis, topic grouping, and urgency scoring.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load Curated Sample Dataset</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => { setActiveTab('paste'); setStatusMessage(null); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'paste'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardEdit className="w-4 h-4" />
          <span>Paste Text / Bulk Reviews</span>
        </button>
        <button
          onClick={() => { setActiveTab('csv'); setStatusMessage(null); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'csv'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload CSV File</span>
        </button>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between space-x-3 animate-fade-in ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-start space-x-3">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold">{statusMessage.text}</p>
              {statusMessage.type === 'success' && (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  AI models categorized sentiment, identified core complaints, and updated the metrics.
                </p>
              )}
            </div>
          </div>
          {statusMessage.type === 'success' && (
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Tab 1: Paste Reviews */}
      {activeTab === 'paste' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Paste Customer Reviews</h2>
              <p className="text-xs text-slate-500">
                Paste one review per line, numbered list, or multiple paragraphs.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              {estimatedReviewsCount} detected item{estimatedReviewsCount === 1 ? '' : 's'}
            </span>
          </div>

          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste feedback here. For example:
1. The delivery took 2 weeks and arrived completely crushed! Horrible experience.
2. Absolutely love the responsive UI and customer support was very helpful.
3. Overcharged on my account and unable to cancel subscription. Please refund."
              className="w-full p-4 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-2 text-slate-500 text-xs">
                <Info className="w-4 h-4 text-indigo-500" />
                <span>AI will extract sentiment score, primary topic, and urgency level automatically.</span>
              </div>

              <button
                type="submit"
                disabled={loading || !pasteText.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Reviews...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze with AI</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Tab 2: Upload CSV */}
      {activeTab === 'csv' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upload CSV File</h2>
              <p className="text-xs text-slate-500">
                Auto-detects columns: review text, customer name, star rating, and review date.
              </p>
            </div>
            <button
              onClick={handleDownloadSampleCsv}
              className="flex items-center space-x-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Click to upload or drag & drop customer review CSV'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports .CSV or .TXT files up to 10MB
              </p>
            </div>

            {/* CSV Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">CSV Data Preview (First few rows)</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                    Headers Detected
                  </span>
                </div>
                <div className="overflow-x-auto text-[11px]">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="bg-slate-200/60 font-semibold text-slate-700">
                        {csvPreview[0].map((header, idx) => (
                          <th key={idx} className="p-2 text-left">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {csvPreview.slice(1).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 text-slate-600 truncate max-w-[200px]">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & Classifying CSV...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Import & Run Analysis</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guide Card */}
      <div className="bg-slate-100/80 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 text-xs">How the AI Classification Pipeline Works</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="font-bold text-indigo-700 block mb-1">1. Sentiment Polarity</span>
            <p className="text-[11px] text-slate-500">
              Evaluates review emotional tone into Positive, Neutral, or Negative with numeric scoring from -1.0 to +1.0.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="font-bold text-indigo-700 block mb-1">2. Topic Taxonomy</span>
            <p className="text-[11px] text-slate-500">
              Categorizes issues into Delivery, Quality, Pricing, Customer Service, Usability, Features, Billing, or General.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="font-bold text-indigo-700 block mb-1">3. Urgency Prioritization</span>
            <p className="text-[11px] text-slate-500">
              Detects Critical safety/legal risks, High-urgency churn risks, Medium friction, and Low-priority praise.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
