'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  addClassMember,
  ClassItem,
  ClassMemberItem,
  createClass,
  deleteClass,
  fetchClassMembers,
  fetchClasses,
  importClassMembers,
  removeClassMember,
  updateClass,
} from '@/lib/api/classes';
import { fetchUsers, UserItem } from '@/lib/api/users';

const emptyClassForm = {
  name: '',
  subject: '',
  join_code: '',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClassMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [importingMembers, setImportingMembers] = useState(false);
  const [memberImportFile, setMemberImportFile] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [classesData, teachersData] = await Promise.all([
          fetchClasses(),
          fetchUsers('teacher'),
        ]);
        setClasses(classesData);
        setTeachers(teachersData);
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load classes.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setMembers([]);
      return;
    }

    async function loadMembers() {
      setMembersLoading(true);
      try {
        const result = await fetchClassMembers(selectedClassId);
        setMembers(result);
      } catch (err) {
        console.error(err);
        setError('Failed to load class roster.');
      } finally {
        setMembersLoading(false);
      }
    }

    loadMembers();
  }, [selectedClassId]);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  function resetForm() {
    setClassForm(emptyClassForm);
    setEditingClassId(null);
  }

  async function refreshClasses(nextSelectedClassId?: string | null) {
    const classesData = await fetchClasses();
    setClasses(classesData);
    if (nextSelectedClassId) {
      setSelectedClassId(nextSelectedClassId);
    } else if (classesData.length > 0 && !classesData.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(classesData[0].id);
    }
  }

  async function handleSaveClass() {
    setSavingClass(true);
    setError(null);
    try {
      const teacherId = teachers[0]?.id || classes[0]?.teacher_id;
      if (!teacherId) {
        throw new Error('No teacher record available to assign this class.');
      }
      if (editingClassId) {
        await updateClass(editingClassId, {
          ...classForm,
          teacher_id: teacherId,
        });
        await refreshClasses(editingClassId);
      } else {
        const created = await createClass({
          ...classForm,
          teacher_id: teacherId,
        });
        await refreshClasses(created.id);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setSavingClass(false);
    }
  }

  function handleEditClass(item: ClassItem) {
    setEditingClassId(item.id);
    setClassForm({
      name: item.name,
      subject: item.subject,
      join_code: item.join_code,
    });
    setSelectedClassId(item.id);
  }

  async function handleDeleteClass(classId: string) {
    if (!window.confirm('Delete this class and all related batches/submissions?')) {
      return;
    }
    try {
      await deleteClass(classId);
      await refreshClasses(null);
      if (selectedClassId === classId) {
        setSelectedClassId(null);
        setMembers([]);
      }
      if (editingClassId === classId) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete class.');
    }
  }

  async function handleAddMember() {
    if (!selectedClassId) return;
    setSavingMember(true);
    setError(null);
    try {
      await addClassMember(selectedClassId, {
        email: memberEmail,
        display_name: memberName || undefined,
      });
      setMemberEmail('');
      setMemberName('');
      setMembers(await fetchClassMembers(selectedClassId));
      await refreshClasses(selectedClassId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add class member.');
    } finally {
      setSavingMember(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedClassId) return;
    try {
      await removeClassMember(selectedClassId, memberId);
      setMembers(await fetchClassMembers(selectedClassId));
      await refreshClasses(selectedClassId);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to remove class member.');
    }
  }

  async function handleImportMembers() {
    if (!selectedClassId || !memberImportFile) return;
    setImportingMembers(true);
    setError(null);
    try {
      await importClassMembers(selectedClassId, memberImportFile);
      setMembers(await fetchClassMembers(selectedClassId));
      await refreshClasses(selectedClassId);
      setMemberImportFile(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to import student list.');
    } finally {
      setImportingMembers(false);
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
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage classes, roster membership, and submission eligibility by email.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingClassId ? 'Edit Class' : 'Create Class'}
              </h2>
              {editingClassId && (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                  Cancel edit
                </button>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Class name"
                value={classForm.name}
                onChange={(e) => setClassForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Subject"
                value={classForm.subject}
                onChange={(e) => setClassForm((current) => ({ ...current, subject: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                maxLength={6}
                placeholder="Join code"
                value={classForm.join_code}
                onChange={(e) => setClassForm((current) => ({ ...current, join_code: e.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveClass}
                disabled={savingClass}
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-70"
              >
                {savingClass ? 'Saving...' : editingClassId ? 'Update Class' : 'Create Class'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className={`glass-panel rounded-2xl p-5 transition-all ${selectedClassId === cls.id ? 'ring-2 ring-indigo-300' : ''}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <button type="button" className="text-left flex-1" onClick={() => setSelectedClassId(cls.id)}>
                    <h3 className="text-lg font-bold text-slate-800">{cls.name}</h3>
                    <p className="text-slate-500 text-sm mt-1">{cls.subject} • {cls.join_code}</p>
                    <p className="text-xs text-slate-400 mt-2">{cls.member_count ?? 0} active student(s)</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEditClass(cls)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteClass(cls.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <div className="glass-panel rounded-2xl p-8 text-sm text-slate-500">
                No classes yet. Create one to start managing submissions by roster.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Class Roster</h2>
              <p className="text-sm text-slate-500 mt-1">
                {selectedClass ? `${selectedClass.name} • ${selectedClass.join_code}` : 'Select a class to manage roster'}
              </p>
            </div>

            {selectedClass && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                  <input
                    type="email"
                    placeholder="student email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="display name (optional)"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={savingMember}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {savingMember ? 'Adding...' : 'Add'}
                  </button>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Import roster from CSV/XLSX</p>
                    <p className="text-xs text-slate-500 mt-1">Required columns: `email`, optional `display_name`.</p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xlsm"
                        onChange={(e) => setMemberImportFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      Browse student file
                    </label>
                    <span className="text-sm text-slate-500">
                      {memberImportFile ? memberImportFile.name : 'No file selected'}
                    </span>
                    <button
                      type="button"
                      onClick={handleImportMembers}
                      disabled={!memberImportFile || importingMembers}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {importingMembers ? 'Importing...' : 'Import File'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="border-b border-slate-200/50 bg-slate-50/50 px-6 py-4 text-sm font-semibold text-slate-700">
              Active roster controls who is allowed to submit via email.
            </div>
            <div className="divide-y divide-slate-100">
              {membersLoading && (
                <div className="px-6 py-8 text-sm text-slate-500">Loading roster...</div>
              )}
              {!membersLoading && members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{member.display_name || member.email}</div>
                    <div className="text-sm text-slate-500">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {member.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {!membersLoading && selectedClass && members.length === 0 && (
                <div className="px-6 py-8 text-sm text-slate-500">No students in this class yet.</div>
              )}
              {!selectedClass && (
                <div className="px-6 py-8 text-sm text-slate-500">Select a class on the left to manage roster.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
