'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { createQuestion, deleteQuestion, fetchQuestions, importQuestions, QuestionItem, QuestionPayload, updateQuestion } from '@/lib/api/questions';
import { fetchUsers, UserItem } from '@/lib/api/users';

const emptyForm: QuestionPayload = {
  teacher_id: '',
  subject: '',
  question_text: '',
  expected_answer: '',
  rubric_json: '',
  rubric_text: '',
  max_score: 10,
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [form, setForm] = useState<QuestionPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [questionRes, teacherRes] = await Promise.all([
          fetchQuestions(),
          fetchUsers('teacher'),
        ]);
        setQuestions(questionRes.data);
        setTeachers(teacherRes);
        if (teacherRes.length > 0) {
          setForm((current) => ({ ...current, teacher_id: current.teacher_id || teacherRes[0].id }));
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load question bank.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const subjects = useMemo(
    () => Array.from(new Set(questions.map((item) => item.subject))).sort(),
    [questions],
  );

  const filteredQuestions = useMemo(
    () =>
      questions.filter((item) => {
        const matchesSubject = !subjectFilter || item.subject === subjectFilter;
        const keyword = search.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          item.question_text.toLowerCase().includes(keyword) ||
          (item.rubric_text || '').toLowerCase().includes(keyword) ||
          (item.expected_answer || '').toLowerCase().includes(keyword);
        return matchesSubject && matchesSearch;
      }),
    [questions, search, subjectFilter],
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      teacher_id: teachers[0]?.id || '',
    });
  }

  async function reloadQuestions() {
    const questionRes = await fetchQuestions();
    setQuestions(questionRes.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.teacher_id || !form.subject.trim() || !form.question_text.trim()) {
        throw new Error('Teacher, subject, and question text are required.');
      }

      const payload: QuestionPayload = {
        teacher_id: form.teacher_id,
        subject: form.subject.trim(),
        question_text: form.question_text.trim(),
        expected_answer: form.expected_answer?.trim() || null,
        rubric_json: form.rubric_json?.trim() || null,
        rubric_text: form.rubric_text?.trim() || null,
        max_score: Number(form.max_score) || 0,
      };

      if (editingId) {
        await updateQuestion(editingId, payload);
      } else {
        await createQuestion(payload);
      }

      await reloadQuestions();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: QuestionItem) {
    setEditingId(item.id);
    setForm({
      teacher_id: item.teacher_id,
      subject: item.subject,
      question_text: item.question_text,
      expected_answer: item.expected_answer || '',
      rubric_json: item.rubric_json || '',
      rubric_text: item.rubric_text || '',
      max_score: Number(item.max_score),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this question from the bank?');
    if (!confirmed) return;

    try {
      await deleteQuestion(id);
      if (editingId === id) resetForm();
      await reloadQuestions();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete question.');
    }
  }

  async function handleImport() {
    if (!form.teacher_id || !importFile) {
      setError('Choose a teacher and a CSV/XLSX file before importing.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      await importQuestions(form.teacher_id, importFile);
      await reloadQuestions();
      setImportFile(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to import question bank file.');
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4849da' }}>progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your reusable exam questions and associated AI grading rubrics.</p>
        </div>
        <button
          onClick={resetForm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          {editingId ? 'Create New Question' : '+ Add Question'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {editingId ? 'Edit Question' : 'Create Question'}
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Teacher</span>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.teacher_id}
                onChange={(e) => setForm((current) => ({ ...current, teacher_id: e.target.value }))}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.display_name || teacher.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Subject</span>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.subject}
                onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                placeholder="Python Programming"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Max Score</span>
              <input
                type="number"
                min="0"
                step="0.5"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.max_score}
                onChange={(e) => setForm((current) => ({ ...current, max_score: Number(e.target.value) || 0 }))}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Question Text</span>
            <textarea
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
              value={form.question_text}
              onChange={(e) => setForm((current) => ({ ...current, question_text: e.target.value }))}
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Expected Answer</span>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
              value={form.expected_answer || ''}
              onChange={(e) => setForm((current) => ({ ...current, expected_answer: e.target.value }))}
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Rubric Text</span>
            <textarea
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
              value={form.rubric_text || ''}
              onChange={(e) => setForm((current) => ({ ...current, rubric_text: e.target.value }))}
            />
          </label>

          <div className="flex justify-end gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import Question Bank</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload CSV/XLSX with columns: `subject`, `question_text`, `max_score`, optional `expected_answer`, `rubric_text`, `rubric_json`.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100">
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            Browse question file
          </label>
          <span className="text-sm text-slate-500">
            {importFile ? importFile.name : 'No file selected'}
          </span>
          <button
            type="button"
            onClick={handleImport}
            disabled={!importFile || !form.teacher_id || importing}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {importing ? 'Importing...' : 'Import File'}
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="p-4 border-b border-slate-200/50 bg-slate-50/50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-64 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none text-slate-600"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500">{filteredQuestions.length} question(s)</p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 text-sm">
              <th className="px-6 py-4 font-medium">Question</th>
              <th className="px-6 py-4 font-medium">Subject</th>
              <th className="px-6 py-4 font-medium">Rubric</th>
              <th className="px-6 py-4 font-medium">Created On</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredQuestions.map((question) => (
              <tr key={question.id} className="hover:bg-slate-50/50 transition-colors group align-top">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{question.question_text}</p>
                  {question.expected_answer && (
                    <p className="mt-1 text-xs text-slate-500">Expected: {question.expected_answer}</p>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  <div>{question.subject}</div>
                  <div className="text-xs text-slate-400">Max: {question.max_score}</div>
                </td>
                <td className="px-6 py-4">
                  {question.rubric_text ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-xs font-medium">
                      Auto-Grader Ready
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 text-xs font-medium">
                      Missing Rubric
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(question.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleEdit(question)}
                      className="text-indigo-600 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="text-red-600 font-medium text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredQuestions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                  No questions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
