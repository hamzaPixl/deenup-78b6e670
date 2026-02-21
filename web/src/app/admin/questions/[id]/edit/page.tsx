'use client';
// web/src/app/admin/questions/[id]/edit/page.tsx

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Question, CreateQuestionRequest } from '@deenup/shared';
import QuestionForm from '../../../../../components/admin/QuestionForm';
import { apiClient } from '../../../../../lib/api';

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Question>(`/api/questions/${id}`)
      .then(setQuestion)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: CreateQuestionRequest) => {
    await apiClient.put(`/api/questions/${id}`, data);
    router.push('/admin/questions');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (error) return <div style={{ padding: 16, color: '#dc3545' }}>{error}</div>;
  if (!question) return null;

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Edit Question</h2>
      <QuestionForm initialData={question} onSubmit={handleSubmit} />
    </div>
  );
}
