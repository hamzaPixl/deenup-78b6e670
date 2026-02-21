'use client';
// web/src/components/admin/ReviewPanel.tsx

import React, { useState } from 'react';
import { Question } from '@deenup/shared';

interface ReviewPanelProps {
  question: Question;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, notes: string) => Promise<void>;
}

const DIFF_COLORS: Record<string, string> = {
  easy: '#28a745',
  medium: '#fd7e14',
  advanced: '#dc3545',
};

export default function ReviewPanel({ question, onApprove, onReject }: ReviewPanelProps) {
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try { await onApprove(question.id); } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try { await onReject(question.id, notes); } finally { setLoading(false); }
  };

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 24, marginBottom: 20, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: '#e3f2fd', color: '#1565c0' }}>{question.theme}</span>
        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: '#f5f5f5', color: DIFF_COLORS[question.difficulty] ?? '#333', fontWeight: 700 }}>{question.difficulty}</span>
        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: '#f5f5f5', color: '#666' }}>{question.type}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#999' }}>by {question.createdBy}</span>
      </div>

      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{question.text}</p>

      {/* Options */}
      <div style={{ marginBottom: 16 }}>
        {question.options.map((opt, i) => (
          <div key={i} style={{
            padding: '8px 12px', marginBottom: 6, borderRadius: 4,
            background: opt.isCorrect ? '#d4edda' : '#f8f9fa',
            border: opt.isCorrect ? '1px solid #28a745' : '1px solid #dee2e6',
            fontSize: 14, color: opt.isCorrect ? '#155724' : '#212529',
          }}>
            {opt.isCorrect ? '✓ ' : ''}{opt.text}
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div style={{ padding: 12, background: '#fffde7', borderRadius: 4, marginBottom: 16, fontSize: 14 }}>
        <strong>Explanation:</strong> {question.explanation}
      </div>

      {/* Actions */}
      {!rejecting ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{ padding: '8px 24px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            {loading ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={loading}
            style={{ padding: '8px 24px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            ✕ Reject
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Rejection notes (required)…"
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ced4da', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReject}
              disabled={loading || !notes.trim()}
              style={{ padding: '8px 24px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
            >
              {loading ? '…' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => { setRejecting(false); setNotes(''); }}
              disabled={loading}
              style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
