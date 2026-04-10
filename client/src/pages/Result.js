import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { format } from 'date-fns';

const typeLabels = {
  whatsapp: 'WhatsApp Chat',
  upi_payment: 'UPI Payment',
  instagram_dm: 'Instagram DM',
  email: 'Email',
  unknown: 'Unknown Type',
  other: 'Other',
};

const resultConfig = {
  real: { label: 'Authentic', color: 'success', bg: 'bg-success/10 border-success/20', icon: '✓', glow: 'glow-green' },
  suspicious: { label: 'Suspicious', color: 'warning', bg: 'bg-warning/10 border-warning/20', icon: '⚠', glow: 'glow-yellow' },
  fake: { label: 'Likely Fake', color: 'danger', bg: 'bg-danger/10 border-danger/20', icon: '✗', glow: 'glow-red' },
};

const CircularScore = ({ score, result }) => {
  const cfg = resultConfig[result] || resultConfig.suspicious;
  const colorMap = { success: '#22C55E', warning: '#F59E0B', danger: '#EF4444' };
  const color = colorMap[cfg.color];
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#334155" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-num font-bold text-2xl text-text-primary">{score}</p>
        <p className="text-xs text-muted">/ 100</p>
      </div>
    </div>
  );
};

const LevelBar = ({ label, score, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-text-secondary">{label}</span>
      <span className={`font-num text-${color}`}>{score}/100</span>
    </div>
    <div className="h-1.5 bg-bg rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-${color} transition-all duration-700`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export default function Result() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get(`/reports/${id}`);
        if (data.success) setReport(data.report);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="spinner" />
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <p className="text-text-secondary">Report not found.</p>
      <Link to="/history" className="text-primary mt-2 hover:underline text-sm">← Back to History</Link>
    </div>
  );

  const cfg = resultConfig[report.result] || resultConfig.suspicious;
  const colorMap = { success: '#22C55E', warning: '#F59E0B', danger: '#EF4444' };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link to="/history" className="hover:text-text-secondary">History</Link>
        <span>/</span>
        <span className="text-text-secondary">Analysis Result</span>
      </div>

      {/* Result Hero */}
      <div className={`bg-card border ${cfg.bg} rounded-2xl p-6 mb-6 ${cfg.glow}`}>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <CircularScore score={report.confidence} result={report.result} />

          <div className="flex-1 text-center md:text-left">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold mb-3 text-${cfg.color} bg-${cfg.color}/10 border-${cfg.color}/20`}>
              <span>{cfg.icon}</span>
              {cfg.label}
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-1">
              {typeLabels[report.screenshotType]} Detected
            </h1>
            <p className="text-text-secondary text-sm">
              Confidence score: <span className="font-num font-bold" style={{ color: colorMap[cfg.color] }}>{report.confidence}%</span>
              {' · '}Analyzed in {report.processingTime}ms
            </p>
            <p className="text-muted text-xs mt-1">
              {format(new Date(report.createdAt), 'MMMM d, yyyy at h:mm a')}
            </p>
          </div>

          <Link
            to="/upload"
            className="flex-shrink-0 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            Analyze Another
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Image Preview + Heatmap */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-text-primary">Screenshot</h2>
            {report.heatmapUrl && (
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                  showHeatmap
                    ? 'bg-danger/15 text-danger border-danger/20'
                    : 'bg-cardLight text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                {showHeatmap ? '🔴 Heatmap ON' : '🔵 Show Heatmap'}
              </button>
            )}
          </div>
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={showHeatmap && report.heatmapUrl ? report.heatmapUrl : report.imageUrl}
              alt="Screenshot"
              className="w-full max-h-80 object-contain bg-bg"
            />
            {showHeatmap && (
              <div className="absolute top-2 right-2 bg-danger/90 text-white text-xs px-2 py-1 rounded-lg font-medium">
                Manipulation Heatmap
              </div>
            )}
          </div>
        </div>

        {/* Detection Levels */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text-primary mb-5">Analysis Breakdown</h2>
          <div className="space-y-4">
            <LevelBar
              label="Level 1 — Metadata Analysis"
              score={report.analysisLevels?.level1?.score ?? 0}
              color="primary"
            />
            <LevelBar
              label="Level 2 — Pixel Analysis"
              score={report.analysisLevels?.level2?.score ?? 0}
              color="warning"
            />
            <LevelBar
              label="Level 3 — AI Detection"
              score={report.analysisLevels?.level3?.score ?? 0}
              color="success"
            />
          </div>

          {/* Metadata */}
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Image Metadata</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Format', value: report.metadata?.format?.toUpperCase() || '—' },
                { label: 'Size', value: report.metadata?.size ? `${(report.metadata.size / 1024).toFixed(1)} KB` : '—' },
                { label: 'Width', value: report.metadata?.width ? `${report.metadata.width}px` : '—' },
                { label: 'Height', value: report.metadata?.height ? `${report.metadata.height}px` : '—' },
                { label: 'Compression', value: report.metadata?.compressionLevel || '—' },
                { label: 'Color Profile', value: report.metadata?.colorProfile || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-bg rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="text-xs font-num font-medium text-text-secondary">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Findings */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-display font-semibold text-text-primary mb-4">
          AI Findings
          <span className="text-xs font-normal text-muted ml-2">({report.reasons?.length || 0} indicators)</span>
        </h2>
        <div className="space-y-2">
          {report.reasons?.length > 0 ? report.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-bg border border-border/50">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                report.result === 'real'
                  ? 'bg-success/20 text-success'
                  : report.result === 'fake'
                  ? 'bg-danger/20 text-danger'
                  : 'bg-warning/20 text-warning'
              }`}>
                {report.result === 'real' ? '✓' : '!'}
              </div>
              <p className="text-sm text-text-secondary">{r}</p>
            </div>
          )) : (
            <p className="text-muted text-sm">No specific findings recorded.</p>
          )}
        </div>
      </div>

      {/* Level details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'level1', title: 'Metadata Findings', icon: '📄' },
          { key: 'level2', title: 'Pixel Findings', icon: '🔬' },
          { key: 'level3', title: 'AI Findings', icon: '🧠' },
        ].map(({ key, title, icon }) => (
          <div key={key} className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{icon} {title}</h3>
            <div className="space-y-1.5">
              {(report.analysisLevels?.[key]?.findings || []).map((f, i) => (
                <p key={i} className="text-xs text-text-secondary leading-relaxed">• {f}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
