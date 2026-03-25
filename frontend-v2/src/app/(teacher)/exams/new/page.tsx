'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchClasses, ClassItem } from '@/lib/api/classes';
import { fetchQuestions, QuestionItem } from '@/lib/api/questions';
import { createExam } from '@/lib/api/exams';

export default function ExamBuilderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class_id: '',
    time_limit_minutes: 45,
    rubric_text: '',
  });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [classesData, questionsData] = await Promise.all([
          fetchClasses(),
          fetchQuestions(),
        ]);
        setClasses(classesData);
        setQuestions(questionsData.data);

        if (classesData.length > 0) {
          setFormData((current) => ({
            ...current,
            class_id: current.class_id || classesData[0].id,
            subject: current.subject || classesData[0].subject,
          }));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load classes or question bank.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const subjectMatchedQuestions = useMemo(
    () => questions.filter((item) => !formData.subject || item.subject === formData.subject),
    [questions, formData.subject],
  );

  const visibleQuestions = useMemo(
    () => (subjectMatchedQuestions.length > 0 ? subjectMatchedQuestions : questions),
    [questions, subjectMatchedQuestions],
  );

  useEffect(() => {
    if (!visibleQuestions.length) {
      setSelectedQuestionIds([]);
      return;
    }
    setSelectedQuestionIds((current) => {
      const stillVisible = current.filter((id) => visibleQuestions.some((item) => item.id === id));
      return stillVisible.length ? stillVisible : visibleQuestions.map((item) => item.id);
    });
  }, [visibleQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedClass = classes.find((item) => item.id === formData.class_id);
      const payload = {
        class_id: formData.class_id,
        title: formData.title,
        subject: formData.subject,
        time_limit_minutes: formData.time_limit_minutes,
        question_ids: selectedQuestionIds,
        rubric_text: formData.rubric_text,
      };
      if (!selectedClass) {
        throw new Error('Please select a class.');
      }
      if (!payload.question_ids.length) {
        throw new Error('Please select at least one question.');
      }

      const exam = await createExam(payload);
      router.push(`/exams/${exam.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Exam Batch</h1>
        <p className="text-gray-500 mb-8">Configure your exam settings, select questions, and define AI grading rules.</p>
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">1. Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Midterm 1 - Calculus"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.subject}
                  onChange={(e) => {
                    const subject = e.target.value;
                    const nextClass = classes.find((item) => item.subject === subject);
                    setFormData({
                      ...formData,
                      subject,
                      class_id: nextClass?.id || '',
                    });
                  }}
                >
                  <option value="">Select subject</option>
                  {Array.from(new Set(classes.map((item) => item.subject))).map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              >
                <option value="">Select class</option>
                {classes
                  .filter((item) => !formData.subject || item.subject === formData.subject)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.join_code})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input 
                type="number" 
                className="w-1/3 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.time_limit_minutes}
                onChange={(e) => setFormData({...formData, time_limit_minutes: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Section 2: Questions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2">2. Questions</h2>
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 space-y-4">
              <p className="text-blue-800 font-medium">
                {selectedQuestionIds.length} question(s) selected from the question bank.
              </p>
              {formData.subject && subjectMatchedQuestions.length === 0 && questions.length > 0 && (
                <p className="text-sm text-amber-700">
                  No question matches subject "{formData.subject}". Showing all questions instead.
                </p>
              )}
              <div className="space-y-3">
                {visibleQuestions.map((question) => (
                  <label key={question.id} className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={(e) => {
                        setSelectedQuestionIds((current) =>
                          e.target.checked
                            ? [...current, question.id]
                            : current.filter((id) => id !== question.id),
                        );
                      }}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">{question.question_text}</p>
                      <p className="text-xs text-slate-500">Subject: {question.subject} · Max score: {question.max_score}</p>
                    </div>
                  </label>
                ))}
                {visibleQuestions.length === 0 && (
                  <p className="text-sm text-slate-500">No question available for the selected subject.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: AI Grading Rules */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2 flex justify-between items-center">
              <span>3. AI Grading Rubric</span>
              <button type="button" className="text-sm bg-indigo-50 text-indigo-700 pr-3 pl-2 py-1 rounded-md flex items-center hover:bg-indigo-100 transition-colors">
                <span className="mr-1">✨</span> Assist Me
              </button>
            </h2>
            <p className="text-sm text-gray-500">Define the rules for the AI Agent to grade this specific batch.</p>
            <textarea 
              rows={8}
              placeholder="Example: Deduct 1 point for missing units. Award full points if the final answer is correct regardless of method..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={formData.rubric_text}
              onChange={(e) => setFormData({...formData, rubric_text: e.target.value})}
            ></textarea>
          </div>

          <div className="pt-6 border-t border-gray-200 flex justify-end space-x-4">
            <Link href="/dashboard" className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center disabled:opacity-70"
            >
              {isSubmitting ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
