import React, { useState } from 'react';
import { apiUpdateApiKey } from '../api/client';
import { User } from '../types';
import { X, Key, CheckCircle, ShieldCheck, Sparkles, Cpu } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onApiKeyUpdated: (hasKey: boolean) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  user,
  onApiKeyUpdated,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatusMsg({ type: 'error', text: 'Please sign in or register to persist your custom Claude API key.' });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await apiUpdateApiKey(keyInput.trim());
      setStatusMsg({ type: 'success', text: res.message });
      onApiKeyUpdated(res.has_claude_key);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update API key' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">AI Engine Settings</h3>
              <p className="text-xs text-slate-500">Claude 3.5 Sonnet & Intelligent Fallback Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Engine Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border ${
              user?.has_claude_key
                ? 'border-emerald-300 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50 opacity-75'
            }`}>
              <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-xs mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Claude 3.5 Sonnet</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Deep semantic comprehension, fine-grained nuance & executive summaries.
              </p>
              <div className="mt-2 text-[10px] font-bold">
                {user?.has_claude_key ? (
                  <span className="text-emerald-700 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active & Configured</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Needs API Key</span>
                )}
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              !user?.has_claude_key
                ? 'border-amber-300 bg-amber-50/50'
                : 'border-slate-200 bg-slate-50 opacity-75'
            }`}>
              <div className="flex items-center space-x-2 text-indigo-800 font-semibold text-xs mb-1">
                <Cpu className="w-4 h-4" />
                <span>Core NLP Engine</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                High-speed intelligent NLP: compound sentiment scoring, topic taxonomies & urgency rules.
              </p>
              <div className="mt-2 text-[10px] font-bold">
                {!user?.has_claude_key ? (
                  <span className="text-indigo-800 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Active (Standard Engine)</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Standby Backup</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Anthropic Claude API Key
              </label>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave empty or submit blank to remove the custom key and use the built-in AI engine.
              </p>
            </div>

            {statusMsg && (
              <div className={`p-3 text-xs rounded-xl ${
                statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {statusMsg.text}
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition-colors disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
