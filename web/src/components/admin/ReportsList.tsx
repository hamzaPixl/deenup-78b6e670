'use client';
// web/src/components/admin/ReportsList.tsx

import React from 'react';
import { QuestionReport } from '@deenup/shared';

interface ReportsListProps {
  reports: QuestionReport[];
  onResolve: (reportId: string) => Promise<void>;
}

const REASON_COLORS: Record<string, string> = {
  inaccurate: '#dc3545',
  offensive: '#6f42c1',
  duplicate: '#fd7e14',
  wrong_source: '#007bff',
  other: '#6c757d',
};

export default function ReportsList({ reports, onResolve }: ReportsListProps) {
  if (reports.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#666', background: '#fff', borderRadius: 8 }}>No reports found.</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f1f3f5' }}>
            {['Question', 'Reporter', 'Reason', 'Description', 'Status', 'Created At', 'Action'].map(col => (
              <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#212529', maxWidth: 200 }}>
                {r.questionId}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#495057' }}>{r.reportedBy}</td>
              <td style={{ padding: '10px 16px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, color: '#fff', background: REASON_COLORS[r.reason] ?? '#6c757d', fontWeight: 600 }}>
                  {r.reason}
                </span>
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#495057', maxWidth: 200 }}>
                {r.description ?? '—'}
              </td>
              <td style={{ padding: '10px 16px' }}>
                {r.resolved ? (
                  <span style={{ fontSize: 12, color: '#28a745', fontWeight: 600 }}>
                    ✓ Resolved{r.resolvedAt ? ` ${new Date(r.resolvedAt).toLocaleDateString()}` : ''}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#fd7e14', fontWeight: 600 }}>Unresolved</span>
                )}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 12, color: '#868e96' }}>
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '10px 16px' }}>
                {!r.resolved && (
                  <button
                    onClick={() => onResolve(r.id)}
                    style={{ padding: '4px 12px', fontSize: 13, background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Resolve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
