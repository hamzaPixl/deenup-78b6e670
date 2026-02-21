'use client';
// web/src/app/admin/reports/page.tsx

import React, { useEffect, useState } from 'react';
import { QuestionReport } from '@deenup/shared';
import ReportsList from '../../../components/admin/ReportsList';
import { apiClient } from '../../../lib/api';

type Filter = 'all' | 'unresolved' | 'resolved';

export default function ReportsPage() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter === 'unresolved') params.resolved = 'false';
    if (filter === 'resolved') params.resolved = 'true';

    setLoading(true);
    apiClient
      .get<{ data: QuestionReport[] }>('/api/reports', params)
      .then(data => setReports(data.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleResolve = async (reportId: string) => {
    await apiClient.put(`/api/reports/${reportId}/resolve`);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true, resolvedAt: new Date().toISOString() } : r));
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 24, fontWeight: 700 }}>Reports</h2>

      {/* Filter toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'unresolved', 'resolved'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 4,
              border: '1px solid #dee2e6',
              cursor: 'pointer',
              fontSize: 14,
              background: filter === f ? '#007bff' : '#fff',
              color: filter === f ? '#fff' : '#495057',
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading…</div>}
      {error && <div style={{ padding: 16, background: '#fff3f3', color: '#dc3545', borderRadius: 4 }}>{error}</div>}
      {!loading && !error && <ReportsList reports={reports} onResolve={handleResolve} />}
    </div>
  );
}
