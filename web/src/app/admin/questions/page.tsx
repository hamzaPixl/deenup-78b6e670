'use client';
// web/src/app/admin/questions/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Question, QuestionListResponse, THEMES, DIFFICULTIES, QUESTION_STATUSES } from '@deenup/shared';
import QuestionTable from '../../../components/admin/QuestionTable';
import { apiClient } from '../../../lib/api';

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursors, setCursors] = useState<string[]>([]);

  // Filters
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchQuestions = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '20' };
      if (theme) params.theme = theme;
      if (difficulty) params.difficulty = difficulty;
      if (status) params.status = status;
      if (search) params.search = search;
      if (cursor) params.cursor = cursor;

      const data = await apiClient.get<QuestionListResponse>('/api/questions', params);
      setQuestions(data.data);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [theme, difficulty, status, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleEdit = (id: string) => router.push(`/admin/questions/${id}/edit`);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/questions/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursors(prev => [...prev, nextCursor]);
    fetchQuestions(nextCursor);
  };

  const handlePrevPage = () => {
    const prev = [...cursors];
    prev.pop();
    const cursor = prev[prev.length - 1];
    setCursors(prev);
    fetchQuestions(cursor);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Questions</h2>
        <button
          onClick={() => router.push('/admin/questions/new')}
          style={{
            padding: '8px 20px',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + New Question
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={theme} onChange={e => setTheme(e.target.value)} style={selectStyle}>
          <option value="">All Themes</option>
          {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={selectStyle}>
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          {QUESTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, minWidth: 200 }}
        />
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading…</div>}
      {error && <div style={{ padding: 16, background: '#fff3f3', color: '#dc3545', borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      {!loading && !error && (
        <QuestionTable questions={questions} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
        {cursors.length > 0 && (
          <button onClick={handlePrevPage} style={btnStyle}>← Previous</button>
        )}
        {nextCursor && (
          <button onClick={handleNextPage} style={btnStyle}>Next →</button>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 4,
  border: '1px solid #ced4da',
  fontSize: 14,
  background: '#fff',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
};
