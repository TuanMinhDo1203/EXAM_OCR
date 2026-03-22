'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fetchSubmissionGrade } from '@/lib/api/grades';
import { SubmissionGradeDetail } from '@/types/grade_detail';

export default function ResolutionDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SubmissionGradeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await fetchSubmissionGrade(id);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading submission data...</div>;
  if (!data) return <div className="p-8 text-red-500">Submission not found</div>;

  const currentGrade = data.grades[0];
  const currentPage = data.pages[0];

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6">
      {/* Left Panel: Image Viewer */}
      <div className="w-1/2 border-r border-gray-200 bg-gray-50 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <Link href={`/exams/${data.submission.exam_batch_id}`} className="text-gray-500 hover:text-gray-700">
            ← Back to Batch
          </Link>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50">Zoom In</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded text-sm hover:bg-gray-50">Zoom Out</button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[600px] flex items-center justify-center">
          {currentPage ? (
             <img src={currentPage.image_url} alt="Student submission" className="max-w-full h-auto" />
          ) : (
             <span className="text-gray-400">No image available</span>
          )}
        </div>
      </div>

      {/* Right Panel: AI Evaluation & Scoring */}
      <div className="w-1/2 bg-white flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{data.submission.student.display_name}</h2>
            <p className="text-sm text-gray-500">Submission ID: {data.submission.id}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            data.submission.ocr_status === 'verified' ? 'bg-green-100 text-green-700' : 
            data.submission.ocr_status === 'attention' ? 'bg-orange-100 text-orange-700' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {data.submission.ocr_status.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* AI Interpretation (OCR) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
              <span>🤖</span> <span className="ml-2">AI Interpretation</span>
            </h3>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-sm text-gray-800 border border-gray-100">
              {currentPage?.ocr_text || "No text detected."}
            </div>
            <div className="text-xs text-gray-500 text-right">
              Confidence: {currentPage ? Math.round(currentPage.ocr_confidence * 100) : 0}%
            </div>
          </div>

          {/* AI Grading Agent Evaluation */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center">
              <span>⚖️</span> <span className="ml-2">Grading Agent Evaluation</span>
            </h3>
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold justify-center text-blue-700">{currentGrade?.ai_score || 0}</span>
                  <span className="text-gray-500 font-medium">/ 100</span>
                </div>
                <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded-md border border-blue-200 font-medium shadow-sm">
                  Agent Confidence: {currentGrade ? Math.round(currentGrade.ai_confidence * 100) : 0}%
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {currentGrade?.ai_reasoning || "Pending agent analysis."}
              </p>
            </div>
          </div>

          {/* Teacher Override */}
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              Teacher Override
            </h3>
            <p className="text-xs text-gray-500 mb-4">Adjust the score or add a comment specifically for this student.</p>
            
            <div className="flex items-center space-x-4 mb-4">
              <input type="range" min="0" max="100" defaultValue={currentGrade?.ai_score} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              <input type="number" defaultValue={currentGrade?.ai_score} className="w-16 p-2 text-center border border-gray-300 rounded-lg text-lg font-bold" />
            </div>

            <textarea 
              placeholder="Add teacher comment (optional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
            ></textarea>
          </div>
        </div>

        {/* Action bar */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2">
            Flag Issue
          </button>
          <div className="space-x-3">
            <Link href={`/exams/${data.submission.exam_batch_id}`} className="px-4 py-2 text-gray-600 font-medium">
              Cancel
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm">
              Confirm Grade
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
