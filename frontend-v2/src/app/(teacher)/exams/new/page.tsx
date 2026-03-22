'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamBuilderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    time_limit_minutes: 45,
    rubric_text: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call to create exam
    setTimeout(() => {
      // Mock redirect to the created exam's lobby
      router.push('/lobby/exam_001');
    }, 1000);
  };

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
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                >
                  <option value="">Select subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>
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
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
              <p className="text-blue-800 font-medium mb-2">No questions selected.</p>
              <button type="button" className="bg-white border text-sm border-blue-200 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50">
                Browse Question Bank
              </button>
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
