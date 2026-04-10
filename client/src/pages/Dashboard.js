import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className={`bg-card border rounded-2xl p-5 card-hover border-${color}/20`}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center text-${color}`}>
        {icon}
      </div>
    </div>
    <p className="font-display text-3xl font-bold text-text-primary font-num">{value}</p>
    {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
  </div>
);

const ResultBadge = ({ result }) => {
  const map = {
    real: 'badge-real',
    fake: 'badge-fake',
    suspicious: 'badge-suspicious',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[result] || ''}`}>
      {result?.charAt(0).toUpperCase() + result?.slice(1)}
    </span>
  );
};

const typeLabels = {
  whatsapp: 'WhatsApp',
  upi_payment: 'UPI Payment',
  instagram_dm: 'Instagram DM',
  email: 'Email',
  unknown: 'Unknown',
  other: 'Other',
};

const COLORS = ['#22C55E', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get('/analytics/dashboard');
        if (data.success) setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Process weekly data for chart
  const chartData = React.useMemo(() => {
    if (!stats?.weeklyData) return [];
    const byDate = {};
    stats.weeklyData.forEach(({ _id, count }) => {
      if (!byDate[_id.date]) byDate[_id.date] = { date: _id.date, real: 0, fake: 0, suspicious: 0 };
      byDate[_id.date][_id.result] = count;
    });
    return Object.values(byDate).map(d => ({
      ...d,
      date: d.date.slice(5), // MM-DD
    }));
  }, [stats]);

  const typeData = React.useMemo(() =>
    (stats?.typeBreakdown || []).map(({ _id, count }) => ({
      name: typeLabels[_id] || _id,
      value: count,
    })), [stats]);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <div className="spinner mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  const s = stats?.stats || {};

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Good to see you, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">Here's your detection overview</p>
        </div>
        <Link
          to="/upload"
          className="bg-primary hover:bg-primaryDark text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all glow-blue"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Analyze Image
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Analyses"
          value={s.total ?? 0}
          color="primary"
          sub="All time"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
        />
        <StatCard
          label="Fake Detected"
          value={s.fake ?? 0}
          color="danger"
          sub={s.total ? `${Math.round((s.fake / s.total) * 100)}% of total` : '—'}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        />
        <StatCard
          label="Verified Real"
          value={s.real ?? 0}
          color="success"
          sub={s.total ? `${Math.round((s.real / s.total) * 100)}% of total` : '—'}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <StatCard
          label="Avg. Confidence"
          value={`${s.avgConfidence ?? 0}%`}
          color="warning"
          sub="Detection accuracy"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text-primary mb-4">Weekly Activity</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradFake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="real" stroke="#22C55E" fill="url(#gradReal)" strokeWidth={2} />
                <Area type="monotone" dataKey="fake" stroke="#EF4444" fill="url(#gradFake)" strokeWidth={2} />
                <Area type="monotone" dataKey="suspicious" stroke="#F59E0B" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted text-sm">No data in the last 7 days</p>
            </div>
          )}
        </div>

        {/* Screenshot types */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text-primary mb-4">Screenshot Types</h2>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {typeData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-text-secondary">{d.name}</span>
                    </div>
                    <span className="font-num text-text-primary font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted text-sm">No analyses yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent reports */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-text-primary">Recent Analyses</h2>
          <Link to="/history" className="text-primary text-sm hover:underline">View all →</Link>
        </div>

        {stats?.recentReports?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentReports.map((r) => (
              <Link
                key={r._id}
                to={`/result/${r._id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-cardLight transition-colors"
              >
                <img
                  src={r.imageUrl}
                  alt="screenshot"
                  className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/48x48/1E293B/334155?text=?'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium capitalize truncate">
                    {typeLabels[r.screenshotType] || r.screenshotType} Screenshot
                  </p>
                  <p className="text-xs text-muted">
                    {format(new Date(r.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-num text-sm text-text-secondary">{r.confidence}%</span>
                  <ResultBadge result={r.result} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-cardLight flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" className="w-7 h-7">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <p className="text-text-secondary text-sm">No analyses yet</p>
            <Link to="/upload" className="text-primary text-sm hover:underline mt-1 inline-block">
              Analyze your first screenshot →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
