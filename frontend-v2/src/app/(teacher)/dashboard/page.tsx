import React from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-600">This is the teacher dashboard. UI reference: updated_dashboard_live_submission_rate</p>
      
      <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-orange-600 flex items-center">
          <span className="mr-2">⚠️</span> 3 Exam Batches require attention
        </h2>
        <p className="text-gray-500 mb-4">AI confidence levels are below threshold for manual verification.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
          + Create Exam
        </button>
      </div>
    </div>
  );
}
