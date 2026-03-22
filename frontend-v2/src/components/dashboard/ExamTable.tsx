import React from 'react';
import Link from 'next/link';
import { Exam } from '@/types/exam';

interface ExamTableProps {
  exams: Exam[];
}

export function ExamTable({ exams }: ExamTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
              <th className="px-6 py-4 font-medium">Exam Batch / Code</th>
              <th className="px-6 py-4 font-medium">Subject</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Completion</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{exam.title}</div>
                  <div className="text-gray-400 text-xs">{exam.qr_token}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{exam.subject}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${exam.status === 'active' ? 'bg-green-100 text-green-700' : 
                      exam.status === 'closed' ? 'bg-orange-100 text-orange-700' : 
                      'bg-gray-100 text-gray-700'}`
                  }>
                    {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full" 
                        style={{ width: `${(exam.total_submissions / exam.total_expected) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {exam.total_submissions}/{exam.total_expected}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/exams/${exam.id}`} 
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    View details →
                  </Link>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No exams found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
