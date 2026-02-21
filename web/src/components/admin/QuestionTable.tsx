'use client';
// web/src/components/admin/QuestionTable.tsx

import React from 'react';
import { Question } from '@deenup/shared';

interface QuestionTableProps {
  questions: Question[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6c757d',
  pending_review: '#fd7e14',
  approved: '#28a745',
  rejected: '#dc3545',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: STATUS_COLORS[status] ?? '#6c757d',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default function QuestionTable({ questions, onEdit, onDelete }: QuestionTableProps) {
  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
        No questions found.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f3f5' }}>
            {['Text', 'Theme', 'Difficulty', 'Status', 'Type', 'Created At', 'Actions'].map(
              col => (
                <th
                  key={col}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr
              key={q.id}
              style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}
            >
              <td style={{ padding: '10px 16px', fontSize: 14, color: '#212529' }}>
                {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#495057' }}>
                {q.theme}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#495057' }}>
                {q.difficulty}
              </td>
              <td style={{ padding: '10px 16px' }}>
                <StatusBadge status={q.status} />
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#495057' }}>
                {q.type}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 12, color: '#868e96' }}>
                {new Date(q.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                <button
                  onClick={() => onEdit(q.id)}
                  style={{
                    marginRight: 8,
                    padding: '4px 12px',
                    fontSize: 13,
                    background: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(q.id)}
                  style={{
                    padding: '4px 12px',
                    fontSize: 13,
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
