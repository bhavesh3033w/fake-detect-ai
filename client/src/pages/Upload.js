import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STEPS = ['Uploading image', 'Scanning metadata', 'Pixel analysis', 'AI detection', 'Generating report'];

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: (e) => {
      const err = e[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('File too large (max 10MB)');
      else toast.error(err?.message || 'Invalid file');
    },
  });

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setStep(0);
    setProgress(0);

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setStep((s) => {
        if (s < STEPS.length - 1) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
      setProgress((p) => Math.min(p + 20, 90));
    }, 900);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await API.post('/reports/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(stepInterval);
      setProgress(100);
      setStep(STEPS.length - 1);

      if (data.success) {
        await new Promise((r) => setTimeout(r, 500));
        navigate(`/result/${data.report.id}`);
      } else {
        toast.error(data.message || 'Analysis failed');
        setAnalyzing(false);
      }
    } catch (err) {
      clearInterval(stepInterval);
      toast.error(err.response?.data?.message || 'Analysis failed. Please try again.');
      setAnalyzing(false);
      setProgress(0);
      setStep(0);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary">Analyze Screenshot</h1>
        <p className="text-text-secondary text-sm mt-1">Upload a screenshot to detect authenticity using AI</p>
      </div>

      {!analyzing ? (
        <>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 
              ${isDragActive ? 'dropzone-active border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-cardLight/30'}`}
          >
            <input {...getInputProps()} />

            {preview ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-72 max-w-full rounded-xl border border-border shadow-xl mx-auto block"
                />
                <button
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center text-white text-xs shadow-lg"
                >✕</button>
                <div className="mt-3 text-center">
                  <p className="text-text-secondary text-sm">{file.name}</p>
                  <p className="text-muted text-xs">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" className="w-8 h-8">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="font-display font-semibold text-text-primary mb-1">
                  {isDragActive ? 'Drop image here' : 'Drag & drop screenshot here'}
                </p>
                <p className="text-text-secondary text-sm">or click to browse files</p>
                <p className="text-muted text-xs mt-3">Supports JPEG, PNG, WEBP, GIF, BMP · Max 10MB</p>
              </>
            )}
          </div>

          {/* Detection levels info */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { level: 'L1', label: 'Metadata', desc: 'EXIF data, resolution, compression analysis', color: 'primary' },
              { level: 'L2', label: 'Pixel', desc: 'Noise patterns, block artifacts, copy-move detection', color: 'warning' },
              { level: 'L3', label: 'AI', desc: 'Heuristic CNN analysis, shadow & sharpness checks', color: 'success' },
            ].map((l) => (
              <div key={l.level} className="bg-card border border-border rounded-xl p-4">
                <div className={`text-xs font-mono font-bold text-${l.color} mb-1`}>{l.level} · {l.label}</div>
                <p className="text-xs text-muted leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>

          {/* Analyze button */}
          {file && (
            <button
              onClick={analyze}
              className="mt-6 w-full bg-primary hover:bg-primaryDark text-white font-semibold py-4 rounded-xl text-base transition-all glow-blue flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              Run AI Detection
            </button>
          )}
        </>
      ) : (
        /* Analyzing state */
        <div className="bg-card border border-border rounded-2xl p-8 text-center scan-overlay">
          <div className="relative inline-block mb-6">
            <img
              src={preview}
              alt="Analyzing"
              className="w-48 h-48 object-cover rounded-xl border border-border mx-auto opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-bg/80 flex items-center justify-center">
                <div className="spinner" />
              </div>
            </div>
          </div>

          <h2 className="font-display text-xl font-bold text-text-primary mb-2">Analyzing Image…</h2>
          <p className="text-primary text-sm font-medium mb-6">{STEPS[step]}</p>

          {/* Progress bar */}
          <div className="w-full bg-bg rounded-full h-2 mb-6">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="flex justify-center gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i < step ? 'bg-success' : i === step ? 'bg-primary animate-pulse' : 'bg-border'
                }`} />
                <span className="text-[9px] text-muted hidden sm:block max-w-[60px] text-center leading-tight">
                  {s.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
