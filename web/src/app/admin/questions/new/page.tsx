'use client';
// web/src/app/admin/questions/new/page.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { CreateQuestionRequest } from '@deenup/shared';
import QuestionForm from '../../../../components/admin/QuestionForm';
import { apiClient } from '../../../../lib/api';

export default function NewQuestionPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateQuestionRequest) => {
    await apiClient.post('/api/questions', data);
    router.push('/admin/questions');
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>New Question</h2>
      <QuestionForm onSubmit={handleSubmit} />
    </div>
  );
}
