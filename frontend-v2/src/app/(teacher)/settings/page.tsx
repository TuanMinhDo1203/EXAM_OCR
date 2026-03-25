'use client';

import React, { useEffect, useState } from 'react';
import { fetchOcrSettings, OCRSettings, updateOcrSettings } from '@/lib/api/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<OCRSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setSettings(await fetchOcrSettings());
      } catch (err) {
        console.error(err);
        setError('Failed to load OCR settings.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOcrSettings(settings);
      setSettings(updated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
      </div>
    );
  }

  if (!settings) {
    return <div className="p-8 text-sm text-red-700">Unable to load settings.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OCR Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Tune OCR thresholds and recognition parameters. Execution mode and GPU endpoint are managed from backend env config.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        GPU endpoint URL is loaded from backend <code>.env</code>. This screen lets teachers switch between local CPU OCR and remote GPU OCR without exposing the container URL.
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Inference Mode (TrOCR)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSettings((current) => current ? { ...current, ocr_inference_mode: 'local' } : current)}
              className="rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                borderColor: settings.ocr_inference_mode === 'local' ? '#4f46e5' : '#cbd5e1',
                background: settings.ocr_inference_mode === 'local' ? '#eef2ff' : '#ffffff',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ color: '#4338ca' }}>memory</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">CPU Local</p>
                  <p className="text-xs text-slate-600">Chạy pipeline OCR hiện tại trong backend.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSettings((current) => current ? { ...current, ocr_inference_mode: 'remote' } : current)}
              className="rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                borderColor: settings.ocr_inference_mode === 'remote' ? '#4f46e5' : '#cbd5e1',
                background: settings.ocr_inference_mode === 'remote' ? '#eef2ff' : '#ffffff',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ color: '#4338ca' }}>cloud_upload</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">GPU Remote</p>
                  <p className="text-xs text-slate-600">Gọi OCR qua Azure container URL trong <code>.env</code>.</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Detection + Recognition</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">YOLO confidence</label>
              <input
                type="number"
                step="0.01"
                value={settings.yolo_conf}
                onChange={(e) => setSettings((current) => current ? { ...current, yolo_conf: Number(e.target.value) || 0 } : current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">YOLO IOU</label>
              <input
                type="number"
                step="0.01"
                value={settings.yolo_iou}
                onChange={(e) => setSettings((current) => current ? { ...current, yolo_iou: Number(e.target.value) || 0 } : current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">YOLO min conf</label>
              <input
                type="number"
                step="0.01"
                value={settings.yolo_min_conf}
                onChange={(e) => setSettings((current) => current ? { ...current, yolo_min_conf: Number(e.target.value) || 0 } : current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TrOCR beam search</label>
              <input
                type="number"
                value={settings.trocr_num_beams}
                onChange={(e) => setSettings((current) => current ? { ...current, trocr_num_beams: Number(e.target.value) || 1 } : current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">TrOCR max tokens</label>
              <input
                type="number"
                value={settings.trocr_max_tokens}
                onChange={(e) => setSettings((current) => current ? { ...current, trocr_max_tokens: Number(e.target.value) || 1 } : current)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input
                id="save_visualizations"
                type="checkbox"
                checked={settings.save_visualizations}
                onChange={(e) => setSettings((current) => current ? { ...current, save_visualizations: e.target.checked } : current)}
              />
              <label htmlFor="save_visualizations" className="text-sm font-medium text-slate-700">Save BBOX visualizations</label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save OCR Settings'}
        </button>
      </div>
    </div>
  );
}
