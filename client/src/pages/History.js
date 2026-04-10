import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const typeLabels = {
  whatsapp: 'WhatsApp', upi_payment: 'UPI Payment',
  instagram_dm: 'Instagram DM', email: 'Email', unknown: 'Unknown', other: 'Other',
};

const ResultBadge = ({ result }) => {
  const map = { real: 'badge-real', fake: 'badge-fake', suspicious: 'badge-suspicious' };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[result] || ''}`}>
      {result?.charAt(0).toUpperCase() + result?.slice(1)}
    </span>
  );
};

export default function History() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, ...(filter ? { filter } : {}) });
      const { data } = await API.get(`/reports?${params}`);
      if (data.success) {
        setReports(data.reports);
        setPagination(data.pagination);
      }
    } catch (e) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/reports/${id}`);
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast.success('Report deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Analysis History</h1>
          <p className="text-text-secondary text-sm mt-1">
            {pagination.total ?? 0} total analyses
          </p>
        </div>
        <Link to="/upload" className="bg-primary hover:bg-primaryDark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 self-start">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Analysis
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'real', 'suspicious', 'fake'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filter === f
                ? f === '' ? 'bg-primary/15 text-primary border-primary/30'
                  : f === 'real' ? 'bg-success/15 text-success border-success/30'
                  : f === 'fake' ? 'bg-danger/15 text-danger border-danger/30'
                  : 'bg-warning/15 text-warning border-warning/30'
                : 'bg-card text-text-secondary border-border hover:border-primary/30'
            }`}
          >
            {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" className="w-8 h-8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <p className="text-text-secondary mb-2">No analyses found</p>
          <Link to="/upload" className="text-primary text-sm hover:underline">
            Analyze your first screenshot →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {reports.map((r) => (
              <div key={r._id} className="bg-card border border-border rounded-2xl overflow-hidden card-hover group">
                <div className="relative">
                  <img
                    src={r.imageUrl}
                    alt="screenshot"
                    className="w-full h-36 object-cover border-b border-border"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x144/1E293B/334155?text=Preview'; }}
                  />
                  <div className="absolute top-2 right-2">
                    <ResultBadge result={r.result} />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {typeLabels[r.screenshotType] || r.screenshotType}
                    </p>
                    <span className="font-num text-sm font-bold text-text-secondary ml-2 flex-shrink-0">
                      {r.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-4">
                    {format(new Date(r.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to={`/result/${r._id}`}
                      className="flex-1 text-center text-xs py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all font-medium"
                    >
                      View Report
                    </Link>
                    <button
                      onClick={() => handleDelete(r._id)}
                      disabled={deleting === r._id}
                      className="px-3 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-all text-xs disabled:opacity-50"
                    >
                      {deleting === r._id ? (
                        <div className="w-3 h-3 border border-danger/30 border-t-danger rounded-full animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm text-text-secondary hover:border-primary disabled:opacity-40 transition-all"
              >
                ← Previous
              </button>
              <span className="text-sm text-muted font-num">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.pages}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm text-text-secondary hover:border-primary disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
