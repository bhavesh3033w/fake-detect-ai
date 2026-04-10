import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Profile() {
  const { user, generateApiKey } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const data = await generateApiKey();
      if (data.success) toast.success('API key generated!');
    } catch {
      toast.error('Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account and API access</p>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-display font-bold text-2xl">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">{user?.name}</h2>
            <p className="text-text-secondary text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium capitalize">
                {user?.role}
              </span>
              <span className="text-xs text-muted">
                Joined {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-4 text-center border border-border">
            <p className="font-num text-3xl font-bold text-primary">{user?.totalAnalyses ?? 0}</p>
            <p className="text-xs text-muted mt-1">Total Analyses</p>
          </div>
          <div className="bg-bg rounded-xl p-4 text-center border border-border">
            <p className="font-num text-3xl font-bold text-success">
              {user?.role === 'admin' ? '∞' : '10GB'}
            </p>
            <p className="text-xs text-muted mt-1">Storage Limit</p>
          </div>
        </div>
      </div>

      {/* API Access */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="w-5 h-5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-display font-semibold text-text-primary">Public API Access</h2>
            <p className="text-xs text-muted">Use your API key to integrate with external services</p>
          </div>
        </div>

        {user?.apiKey ? (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Your API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 font-mono text-xs text-text-secondary overflow-hidden text-ellipsis">
                {user.apiKey}
              </div>
              <button
                onClick={copyKey}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  copied
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-cardLight text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">Keep this key secret. Include it as <span className="font-mono text-primary">x-api-key</span> header in requests.</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-secondary text-sm mb-4">Generate an API key to access the public detection API</p>
            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="bg-warning/10 border border-warning/20 text-warning hover:bg-warning hover:text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            >
              {generating ? 'Generating...' : 'Generate API Key'}
            </button>
          </div>
        )}

        {/* API Docs snippet */}
        <div className="mt-5 pt-5 border-t border-border">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">API Usage Example</h3>
          <pre className="bg-bg border border-border rounded-xl p-4 text-xs font-mono text-text-secondary overflow-x-auto">
{`curl -X POST https://yourapp.com/api/v1/detect \\
  -H "x-api-key: YOUR_API_KEY" \\
  -F "image=@screenshot.png"

# Response:
{
  "result": "fake" | "suspicious" | "real",
  "confidence": 72,
  "reasons": ["..."],
  "screenshot_type": "upi_payment"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
