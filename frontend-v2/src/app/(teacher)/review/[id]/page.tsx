/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, useState, use, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api/client';
import { fetchSubmissionGrade, overrideGrade, updateSubmissionPageOcrText, reEvaluateAIGrade } from '@/lib/api/grades';
import { SubmissionGradeDetail } from '@/types/grade_detail';
import 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-github_dark';
import 'ace-builds/src-noconflict/ext-language_tools';

const AceEditor = dynamic(() => import('react-ace'), { ssr: false });

function shouldAutoRefreshReview(status?: string | null) {
  if (!status) return false;
  return ['uploaded', 'pending', 'processing', 'ocr_processing', 'ocr_done', 'grading'].includes(status);
}

export default function ResolutionDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SubmissionGradeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [teacherComment, setTeacherComment] = useState('');
  const [editableCode, setEditableCode] = useState('');
  const [imageMode, setImageMode] = useState<'visualization' | 'original'>('visualization');
  const [saving, setSaving] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [ocrDirty, setOcrDirty] = useState(false);
  const [gradeDirty, setGradeDirty] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const ocrDirtyRef = useRef(false);
  const gradeDirtyRef = useRef(false);
  const imageViewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    ocrDirtyRef.current = ocrDirty;
  }, [ocrDirty]);

  useEffect(() => {
    gradeDirtyRef.current = gradeDirty;
  }, [gradeDirty]);

  useEffect(() => {
    let cancelled = false;

    async function load(isInitial = false) {
      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        const result = await fetchSubmissionGrade(id);
        if (cancelled) return;
        setData(result);
        if (!gradeDirtyRef.current) {
          setOverrideScore(result.grades?.[0]?.teacher_override_score ?? result.grades?.[0]?.ai_score ?? 0);
          setTeacherComment(result.grades?.[0]?.teacher_comment ?? '');
        }
        if (!ocrDirtyRef.current) {
          setEditableCode(result.pages?.[0]?.ocr_text ?? '');
        }
        setImageMode(result.pages?.[0]?.visualization_url ? 'visualization' : 'original');
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load(true);

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!shouldAutoRefreshReview(data?.submission.ocr_status)) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        setRefreshing(true);
        const result = await fetchSubmissionGrade(id);
        if (cancelled) return;
        setData(result);
        if (!gradeDirtyRef.current) {
          setOverrideScore(result.grades?.[0]?.teacher_override_score ?? result.grades?.[0]?.ai_score ?? 0);
          setTeacherComment(result.grades?.[0]?.teacher_comment ?? '');
        }
        if (!ocrDirtyRef.current) {
          setEditableCode(result.pages?.[0]?.ocr_text ?? '');
        }
        setImageMode(result.pages?.[0]?.visualization_url ? 'visualization' : 'original');
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    }

    const intervalId = window.setInterval(() => {
      refresh();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [id, data?.submission.ocr_status]);

  useEffect(() => {
    if (!ocrDirty) {
      setEditableCode(data?.pages?.[0]?.ocr_text ?? '');
    }
  }, [data?.pages, ocrDirty]);

  useEffect(() => {
    if (imageZoom <= 1.02) {
      setImagePan({ x: 0, y: 0 });
      setIsPanning(false);
    }
  }, [imageZoom]);

  const currentGrade = data?.grades?.[0];
  const currentPage = data?.pages?.[0];
  const sub = data?.submission;
  const currentStatus = sub?.ocr_status as string | undefined;
  const confidencePct = currentPage ? Math.round(currentPage.ocr_confidence * 100) : 0;
  const agentConfPct = currentGrade ? Math.round(currentGrade.ai_confidence * 100) : 0;
  const isVerified = sub?.ocr_status === 'verified';
  const isProcessing = shouldAutoRefreshReview(currentStatus);
  const currentMaxScore = currentGrade?.max_score ?? data?.max_possible_score ?? 100;
  const resolveAssetUrl = (value: string | null | undefined) => {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return `${API_BASE_URL}${value}`;
  };
  const imageSrc = currentPage
    ? imageMode === 'visualization' && currentPage.visualization_url
      ? resolveAssetUrl(currentPage.visualization_url)
      : resolveAssetUrl(currentPage.image_url)
    : null;
  const codeLines = useMemo(() => (editableCode.length ? editableCode.split('\n') : ['']), [editableCode]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
    </div>
  );
  if (!data || !sub) return (
    <div className="p-10" style={{ color: '#a54731' }}>Không tìm thấy bài nộp.</div>
  );

  function resetImageView() {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
    setIsPanning(false);
  }

  function zoomTowardPoint(clientX: number, clientY: number, targetZoom: number) {
    const viewport = imageViewportRef.current;
    if (!viewport) {
      setImageZoom(targetZoom);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const offsetX = clientX - rect.left - rect.width / 2;
    const offsetY = clientY - rect.top - rect.height / 2;
    const zoomRatio = targetZoom / imageZoom;

    setImagePan((current) => ({
      x: current.x - offsetX * (zoomRatio - 1),
      y: current.y - offsetY * (zoomRatio - 1),
    }));
    setImageZoom(targetZoom);
  }

  function handleImageWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const targetZoom = Math.max(1, Math.min(3.2, Number((imageZoom + direction * 0.18).toFixed(2))));
    if (targetZoom === imageZoom) return;
    zoomTowardPoint(event.clientX, event.clientY, targetZoom);
  }

  function handleImageClick(event: React.MouseEvent<HTMLImageElement>) {
    if (isPanning) return;
    const targetZoom = imageZoom <= 1.05 ? 1.9 : Math.min(3.2, Number((imageZoom + 0.35).toFixed(2)));
    zoomTowardPoint(event.clientX, event.clientY, targetZoom);
  }

  function handleImageMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (imageZoom <= 1.02) return;
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: imagePan.x,
      panY: imagePan.y,
    };
  }

  function handleImageMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!panStartRef.current) return;
    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;
    setImagePan({
      x: panStartRef.current.panX + deltaX,
      y: panStartRef.current.panY + deltaY,
    });
  }

  function handleImageMouseUp() {
    panStartRef.current = null;
    setIsPanning(false);
  }

  function handleImageDoubleClick(event: React.MouseEvent<HTMLImageElement>) {
    event.preventDefault();
    if (imageZoom > 1.05) {
      resetImageView();
      return;
    }
    zoomTowardPoint(event.clientX, event.clientY, 2.4);
  }

  async function handleOverride() {
    if (!currentGrade) return;
    setSaving(true);
    try {
      const updated = await overrideGrade(currentGrade.id, overrideScore, teacherComment);
      setData((current) => {
        if (!current) return current;
        const nextGrades = current.grades.map((item) => (item.id === updated.id ? updated : item));
        const nextTotal = nextGrades.reduce((sum, item) => sum + (item.teacher_override_score ?? item.ai_score), 0);
        return {
          ...current,
          grades: nextGrades,
          submission: {
            ...current.submission,
            score: nextTotal,
          },
          total_score: nextTotal,
        };
      });
      setGradeDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCode() {
    if (!currentPage) return;
    setSavingCode(true);
    try {
      const updated = await updateSubmissionPageOcrText(currentPage.id, editableCode);
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((item) => (item.id === updated.id ? updated : item)),
        };
      });
      setOcrDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCode(false);
    }
  }

  async function handleReEvaluateAI() {
    if (!currentGrade) return;
    setEvaluatingAI(true);
    try {
      const updated = await reEvaluateAIGrade(currentGrade.id);
      setData((current) => {
        if (!current) return current;
        const nextGrades = current.grades.map((item) => (item.id === updated.id ? updated : item));
        return {
          ...current,
          grades: nextGrades,
        };
      });
      if (!gradeDirty) {
        setOverrideScore(updated.teacher_override_score ?? updated.ai_score ?? 0);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi chấm điểm AI. Vui lòng thử lại hoặc xem cấu hình OpenAI.');
    } finally {
      setEvaluatingAI(false);
    }
  }

  return (
    /* Full-bleed layout */
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      
      {/* ── Header bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(242,239,233,0.9)', borderBottom: '1px solid rgba(187,186,174,0.2)' }}>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] block mb-0.5" style={{ color: '#4849da' }}>
            Resolution Desk
          </span>
          <h1 className="text-lg font-extrabold tracking-tight" style={{ color: '#38382f' }}>
            Xác minh điểm: {sub.student.display_name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: '#65655b' }}>Batch ID</p>
            <p className="text-sm font-bold" style={{ color: '#38382f' }}>{sub.exam_batch_id}</p>
          </div>
          <Link href={`/exams/${sub.exam_batch_id}`}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold neumorphic-lift transition-all hover:scale-105 active:scale-95"
            style={{ color: '#4849da', background: '#F2EFE9' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Về Batch
          </Link>
        </div>
      </div>

      {/* ── Main workspace ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Scan viewer ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-6" style={{ borderRight: '1px solid rgba(187,186,174,0.15)' }}>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#38382f' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4849da' }}>center_focus_weak</span>
              Bản Scan Gốc
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImageMode('original')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: imageMode === 'original' ? '#e1e0ff' : '#eae9dc', color: imageMode === 'original' ? '#4849da' : '#65655b' }}
              >
                RAW
              </button>
              <button
                type="button"
                onClick={() => setImageMode('visualization')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: imageMode === 'visualization' ? '#e1e0ff' : '#eae9dc', color: imageMode === 'visualization' ? '#4849da' : '#65655b' }}
                disabled={!currentPage?.visualization_url}
              >
                BBOX
              </button>
              <button
                type="button"
                onClick={() => setImageZoom((current) => Math.max(1, Number((current - 0.15).toFixed(2))))}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#eae9dc', color: '#65655b' }}
              >
                -
              </button>
              <button
                type="button"
                onClick={resetImageView}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#eae9dc', color: '#65655b' }}
              >
                Fit {Math.round(imageZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setImageZoom((current) => Math.min(3.2, Number((current + 0.15).toFixed(2))))}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#eae9dc', color: '#65655b' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Sunken scan area with dot grid */}
          <div className="flex-1 neumorphic-pressed rounded-2xl relative overflow-hidden flex items-center justify-center"
            style={{ background: '#e4e3d4', minHeight: '0' }}>
            {/* Dot grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
              style={{ backgroundImage: 'radial-gradient(#4849da 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Paper card */}
            <div className="relative bg-white p-4 shadow-2xl max-w-md w-full overflow-auto"
              style={{ transform: 'rotate(0.5deg)', aspectRatio: '3/4', maxHeight: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentPage && imageSrc ? (
                <div
                  ref={imageViewportRef}
                  className="h-full w-full overflow-hidden"
                  onWheel={handleImageWheel}
                  onMouseDown={handleImageMouseDown}
                  onMouseMove={handleImageMouseMove}
                  onMouseUp={handleImageMouseUp}
                  onMouseLeave={handleImageMouseUp}
                  style={{ cursor: imageZoom > 1.02 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                >
                  <img
                    src={imageSrc}
                    alt="Bài làm của sinh viên"
                    onClick={handleImageClick}
                    onDoubleClick={handleImageDoubleClick}
                    draggable={false}
                    className="h-full w-full select-none object-contain transition-transform duration-150"
                    title="Lăn chuột để zoom, kéo để pan, double click để zoom nhanh"
                    style={{
                      filter: 'grayscale(15%) contrast(1.1)',
                      opacity: 0.9,
                      transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                      transformOrigin: 'center center',
                    }}
                  />
                </div>
              ) : (
                /* Placeholder for demo — simulated handwriting paper */
                <div className="w-full h-full flex flex-col gap-3 p-4">
                  {[
                    "Câu 1: lim(x→0) sin(3x)/x = 3",
                    "Áp dụng L'Hôpital: lim = 3·cos(3x)/1 | x=0 = 3",
                    "---",
                    "Câu 2: ∫x·ln(x)dx",
                    "= (x²/2)·ln(x) - ∫(x²/2)·(1/x)dx",
                    "= (x²/2)·ln(x) - x²/4 + C",
                  ].map((line, i) => (
                    <div key={i} className={`h-5 rounded ${line === '---' ? 'h-px bg-gray-200 my-1' : ''}`}
                      style={{
                        background: line === '---' ? '#e5e7eb' : `rgba(56,56,47,${0.15 + (i % 3) * 0.08})`,
                        width: line === '---' ? '100%' : `${60 + (i * 7) % 35}%`,
                      }} />
                  ))}
                  <p className="absolute bottom-6 right-6 text-xs font-mono" style={{ color: '#65655b', opacity: 0.5 }}>
                    trang_1.jpg
                  </p>
                </div>
              )}
            </div>

            {/* Zoom / rotate controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={() => setImageZoom((current) => Math.min(3.2, Number((current + 0.2).toFixed(2))))}
                className="p-2 rounded-full neumorphic-lift active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#38382f' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>zoom_in</span>
              </button>
              <button
                type="button"
                onClick={resetImageView}
                className="p-2 rounded-full neumorphic-lift active:scale-95 transition-all"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#38382f' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>fit_screen</span>
              </button>
            </div>
            <div className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold"
              style={{ background: 'rgba(255,255,255,0.92)', color: '#65655b' }}>
              Wheel để zoom, kéo để di chuyển, double click để focus nhanh
            </div>
          </div>
        </div>

        {/* ── RIGHT: AI Panel ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden" style={{ background: '#f6f4ea' }}>
          {/* Student header */}
          <div className="flex items-center justify-between px-8 py-5"
            style={{ borderBottom: '1px solid rgba(187,186,174,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm neumorphic-lift"
                style={{ background: '#e1e0ff', color: '#3b3acd' }}>
                {sub.student.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="font-extrabold" style={{ color: '#38382f' }}>{sub.student.display_name}</h2>
                <p className="text-xs" style={{ color: '#65655b' }}>ID: {sub.id}</p>
              </div>
            </div>
            <span className="text-[10px] font-black px-3 py-1 rounded-full"
              style={{
                background: isVerified ? 'rgba(202,235,205,0.5)' : 'rgba(254,139,112,0.2)',
                color: isVerified ? '#3c5842' : '#742410',
              }}>
              {sub.ocr_status.toUpperCase()}
            </span>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* AI Interpretation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>psychology</span>
                  Văn bản AI nhận dạng
                </h3>
                <div className="flex items-center gap-3">
                  {isProcessing && (
                    <span className="text-[10px] font-black px-3 py-1 rounded-full"
                      style={{ background: '#fff2d9', color: '#875b2d' }}>
                      {refreshing ? 'Đang làm mới...' : 'OCR đang xử lý nền'}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{ background: '#caebcd', color: '#3c5842' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4e6b53' }} />
                    <span className="text-[10px] font-black uppercase">{confidencePct}% Tin cậy</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCode}
                    disabled={savingCode}
                    className="text-[10px] font-black px-3 py-1 rounded-full"
                    style={{ background: '#e1e0ff', color: '#3b3acd' }}
                  >
                    {savingCode ? 'Đang lưu...' : 'Lưu OCR Text'}
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border text-sm"
                style={{ background: '#1e1e1e', borderColor: '#2d2d30', boxShadow: '0 20px 50px rgba(15,23,42,0.28)' }}>
                <div className="flex items-center gap-3 border-b px-4 py-2.5"
                  style={{ borderColor: '#2d2d30', background: '#252526' }}>
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ background: '#ff5f57' }} />
                    <span className="h-3 w-3 rounded-full" style={{ background: '#febc2e' }} />
                    <span className="h-3 w-3 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <div className="rounded-md px-3 py-1 text-xs font-semibold"
                    style={{ background: '#1e1e1e', color: '#d4d4d4' }}>
                    submission_{sub.id.slice(0, 8)}.py
                  </div>
                  <span className="ml-auto text-[11px] font-medium" style={{ color: '#8b949e' }}>
                    {editableCode.trim() ? `${codeLines.length} lines` : 'Python'}
                  </span>
                </div>
                <div className="min-h-[680px]" style={{ background: '#1e1e1e' }}>
                  <AceEditor
                    mode="python"
                    theme="github_dark"
                    name={`submission-editor-${sub.id}`}
                    value={editableCode}
                    onChange={(value: string) => {
                      setEditableCode(value);
                      setOcrDirty(true);
                    }}
                    width="100%"
                    height="680px"
                    fontSize={15}
                    showPrintMargin={false}
                    showGutter
                    highlightActiveLine
                    wrapEnabled={false}
                    editorProps={{ $blockScrolling: true }}
                    setOptions={{
                      useWorker: false,
                      tabSize: 4,
                      useSoftTabs: true,
                      enableBasicAutocompletion: true,
                      enableLiveAutocompletion: true,
                      enableSnippets: true,
                      behavioursEnabled: true,
                      displayIndentGuides: true,
                      showLineNumbers: true,
                    }}
                    style={{ background: '#1e1e1e' }}
                  />
                </div>
                <div className="flex items-center justify-between border-t px-4 py-2 text-[11px]"
                  style={{ borderColor: '#2d2d30', background: '#007acc', color: '#ffffff' }}>
                  <span>Python</span>
                  <span>Spaces: 4</span>
                  <span>UTF-8</span>
                  <span>{ocrDirty ? 'Unsaved OCR edits' : 'Saved'}</span>
                </div>
              </div>
            </div>

            {/* AI Grading Evaluation */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>award_star</span>
                  AI Chấm Điểm
                </h3>
                <button
                  type="button"
                  onClick={handleReEvaluateAI}
                  disabled={evaluatingAI || savingCode || isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all hover:bg-white disabled:opacity-50 neumorphic-lift"
                  style={{ color: '#4849da', background: '#F2EFE9' }}
                >
                  <span className={`material-symbols-outlined text-[14px] ${evaluatingAI ? 'animate-spin' : ''}`}>sync</span>
                  {evaluatingAI ? 'Đang chấm...' : 'Re-evaluate AI'}
                </button>
              </div>
              {currentGrade?.question_text && (
                <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium" style={{ color: '#38382f' }}>
                  {currentGrade.question_text}
                </div>
              )}
              <div className="neumorphic-pressed rounded-xl p-5 space-y-4" style={{ background: '#f0eee3' }}>
              <div className="flex justify-between items-center">
                  <div>
                    <span className="text-3xl font-black" style={{ color: '#4849da' }}>{currentGrade?.ai_score ?? '--'}</span>
                    <span className="text-sm font-bold ml-1" style={{ color: '#65655b' }}>/ {currentMaxScore}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: '#e1e0ff', color: '#3b3acd' }}>
                    Độ tin cậy: {agentConfPct}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(101,101,91,0.7)' }}>
                    Chi tiết phân tích (LLM)
                  </p>
                  {(() => {
                    if (!currentGrade?.ai_reasoning) return <p className="text-sm italic text-gray-400">Đang chờ kết quả AI...</p>;
                    try {
                      const parsed = JSON.parse(currentGrade.ai_reasoning);
                      const scores = parsed?.scores || {};
                      const analysis = parsed?.analysis || {};
                      return (
                        <div className="space-y-4 mt-2">
                           <div className="grid grid-cols-2 gap-3">
                             {[
                               { label: 'Task Response', val: scores.task_response },
                               { label: 'Structure', val: scores.coherence_structure },
                               { label: 'Lexical', val: scores.lexical_resource },
                               { label: 'Grammar', val: scores.grammatical_accuracy },
                               { label: 'Robustness', val: scores.robustness },
                             ].map((s, i) => (
                               <div key={i} className="flex flex-col gap-1">
                                 <div className="flex justify-between text-[9px] font-bold uppercase text-gray-500">
                                   <span>{s.label}</span>
                                   <span style={{ color: '#4849da' }}>{typeof s.val === 'number' ? s.val : '-'} / 9</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                   <div className="h-full transition-all duration-500" style={{ background: '#4849da', width: `${(typeof s.val === 'number' ? s.val : 0) / 9 * 100}%` }} />
                                 </div>
                               </div>
                             ))}
                           </div>
                           
                           <div className="bg-white/50 p-3 rounded-lg border border-black/5 text-sm" style={{ color: 'rgba(56,56,47,0.9)' }}>
                             <p className="font-bold text-[10px] uppercase mb-2" style={{ color: '#65655b' }}>Điểm mạnh / Điểm yếu</p>
                             <ul className="list-disc pl-4 space-y-1 mt-2 text-xs">
                                {analysis.strengths?.map((x: string, i: number) => <li key={`str-${i}`} className="text-emerald-700">{x}</li>)}
                                {analysis.weaknesses?.map((x: string, i: number) => <li key={`weak-${i}`} className="text-rose-700">{x}</li>)}
                                {analysis.ocr_issues_detected?.map((x: string, i: number) => <li key={`ocr-${i}`} className="text-amber-700">OCR Issue: {x}</li>)}
                             </ul>
                           </div>
                        </div>
                      );
                    } catch (e) {
                      return <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(56,56,47,0.8)' }}>{currentGrade.ai_reasoning}</p>;
                    }
                  })()}
                </div>

                {/* Score slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'rgba(101,101,91,0.7)' }}>
                      Điều chỉnh điểm cuối
                    </label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(72,73,218,0.1)', color: '#4849da' }}>
                      {overrideScore}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={Math.max(1, Math.ceil(currentMaxScore))}
                    value={overrideScore}
                    onChange={(e) => {
                      setOverrideScore(Number(e.target.value));
                      setGradeDirty(true);
                    }}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer neumorphic-pressed"
                    style={{ accentColor: '#4849da', background: '#e4e3d4' }}
                  />
                </div>
              </div>
            </div>

            {/* Teacher Comment */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#65655b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#4849da' }}>edit_note</span>
                Nhận xét giáo viên
              </h3>
              <div className="neumorphic-pressed rounded-xl p-4" style={{ background: '#f0eee3' }}>
                <textarea
                  placeholder="Thêm nhận xét cho sinh viên (không bắt buộc)..."
                  className="w-full bg-transparent border-none outline-none text-sm resize-none"
                  rows={4}
                  value={teacherComment}
                  onChange={(e) => {
                    setTeacherComment(e.target.value);
                    setGradeDirty(true);
                  }}
                  style={{ color: '#38382f' }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight neumorphic-lift"
                style={{ background: '#f6f4ea', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>style</span>
                {data.submission.exam_batch_id}
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight neumorphic-lift"
                style={{ background: '#f6f4ea', color: '#38382f' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                {sub.student.display_name.split(' ').pop()}
              </div>
            </div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="flex-shrink-0 p-6 neumorphic-lift"
            style={{ background: '#fcf9f1', borderTop: '1px solid rgba(187,186,174,0.2)' }}>
            <div className="flex items-center justify-between gap-4">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95 neumorphic-lift"
                style={{ color: '#38382f', background: '#F2EFE9' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flag</span>
                Đánh dấu xem xét
              </button>
              <div className="flex items-center gap-3">
                <Link href={`/exams/${sub.exam_batch_id}`}
                  className="px-5 py-3 rounded-full font-bold text-sm transition-all"
                  style={{ color: '#65655b' }}>
                  Huỷ
                </Link>
                <button
                  onClick={handleOverride}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #4849da, #3b3bce)',
                    color: '#faf6ff',
                    boxShadow: '0 4px 20px rgba(72,73,218,0.3)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  {saving ? 'Đang lưu...' : 'Xác nhận điểm AI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
