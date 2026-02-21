'use client';
// web/src/app/admin/review/page.tsx

import React, { useEffect, useState } from 'react';
import { Question } from '@deenup/shared';
import ReviewPanel from '../../../components/admin/ReviewPanel';
import { apiClient } from '../../../lib/api';

export default function ReviewQueuePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: Question[] }>('/api/questions/review-queue')
      .then(res => setQuestions(res.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    await apiClient.post(`/api/questions/${id}/approve`);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleReject = async (id: string, notes: string) => {
    await apiClient.post(`/api/questions/${id}/reject`, { notes });
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div>
      <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Review Queue</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>
        {questions.length} question{questions.length !== 1 ? 's' : ''} pending review
      </p>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading…</div>}
      {error && <div style={{ padding: 16, background: '#fff3f3', color: '#dc3545', borderRadius: 4 }}>{error}</div>}

      {!loading && !error && questions.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#666', background: '#fff', borderRadius: 8 }}>
          🎉 No questions pending review!
        </div>
      )}

      {questions.map(q => (
        <ReviewPanel key={q.id} question={q} onApprove={handleApprove} onReject={handleReject} />
      ))}
    </div>
  );
}
