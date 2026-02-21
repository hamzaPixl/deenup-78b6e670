'use client';
// web/src/components/admin/QuestionForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Question,
  QuestionSource,
  CreateQuestionRequest,
  QuestionOption,
  CreateSourceInput,
  THEMES,
  DIFFICULTIES,
  QUESTION_TYPES,
  SOURCE_TYPES,
  QUESTION_DEFAULTS,
} from '@deenup/shared';

// The API returns Question extended with its sources (loaded via JOIN).
type QuestionWithSources = Question & { sources?: QuestionSource[] };

interface QuestionFormProps {
  initialData?: QuestionWithSources;
  onSubmit: (data: CreateQuestionRequest) => Promise<void>;
}

const emptyQCMOptions = (): QuestionOption[] => [
  { text: '', isCorrect: true },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

const trueFalseOptions = (): QuestionOption[] => [
  { text: 'Vrai', isCorrect: true },
  { text: 'Faux', isCorrect: false },
];

export default function QuestionForm({ initialData, onSubmit }: QuestionFormProps) {
  const [text, setText] = useState(initialData?.text ?? '');
  const [theme, setTheme] = useState<string>(initialData?.theme ?? THEMES[0]);
  const [difficulty, setDifficulty] = useState<string>(initialData?.difficulty ?? DIFFICULTIES[0]);
  const [type, setType] = useState<string>(initialData?.type ?? QUESTION_TYPES[0]);
  const [options, setOptions] = useState<QuestionOption[]>(
    initialData?.options ?? emptyQCMOptions(),
  );
  const [explanation, setExplanation] = useState(initialData?.explanation ?? '');
  const [sources, setSources] = useState<CreateSourceInput[]>(() => {
    if (initialData?.sources && initialData.sources.length > 0) {
      return initialData.sources.map(s => ({
        type: s.type,
        reference: s.reference,
        detail: s.detail ?? undefined,
      }));
    }
    return [{ type: SOURCE_TYPES[0], reference: '' }];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset options when type changes
  useEffect(() => {
    if (type === 'qcm') setOptions(emptyQCMOptions());
    if (type === 'true_false') setOptions(trueFalseOptions());
  }, [type]);

  const handleOptionText = (i: number, val: string) => {
    setOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, text: val } : o)));
  };

  const handleCorrectAnswer = (i: number) => {
    setOptions(prev => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  };

  const addSource = () =>
    setSources(prev => [...prev, { type: SOURCE_TYPES[0], reference: '' }]);

  const removeSource = (i: number) =>
    setSources(prev => prev.filter((_, idx) => idx !== i));

  const updateSource = (i: number, patch: Partial<CreateSourceInput>) => {
    setSources(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const validate = (): string | null => {
    if (text.length < QUESTION_DEFAULTS.MIN_TEXT_LENGTH)
      return `Question text must be at least ${QUESTION_DEFAULTS.MIN_TEXT_LENGTH} characters.`;
    if (text.length > QUESTION_DEFAULTS.MAX_TEXT_LENGTH)
      return `Question text must be at most ${QUESTION_DEFAULTS.MAX_TEXT_LENGTH} characters.`;
    if (explanation.length < QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH)
      return `Explanation must be at least ${QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH} characters.`;
    if (sources.length === 0) return 'At least one source is required.';
    if (sources.some(s => !s.reference.trim())) return 'Each source must have a reference.';
    const correctCount = options.filter(o => o.isCorrect).length;
    if (correctCount !== 1) return 'Exactly one correct answer must be selected.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ text, theme: theme as CreateQuestionRequest['theme'], difficulty: difficulty as CreateQuestionRequest['difficulty'], type: type as CreateQuestionRequest['type'], options, explanation, sources });
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
      {error && (
        <div style={{ padding: 12, background: '#fff3f3', color: '#dc3545', borderRadius: 4, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Question Text *">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          required
          rows={4}
          style={inputStyle}
          placeholder="Enter the question text (min 10 characters)…"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label="Theme *">
          <select value={theme} onChange={e => setTheme(e.target.value)} style={inputStyle}>
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Difficulty *">
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Type *">
          <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
            {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      {/* Options */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Options * (select correct answer)</label>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="correct"
              checked={opt.isCorrect}
              onChange={() => handleCorrectAnswer(i)}
              disabled={type === 'true_false'}
            />
            <input
              type="text"
              value={opt.text}
              onChange={e => handleOptionText(i, e.target.value)}
              disabled={type === 'true_false'}
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`Option ${i + 1}`}
            />
          </div>
        ))}
      </div>

      <Field label="Explanation * (min 20 characters)">
        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          required
          rows={5}
          style={inputStyle}
          placeholder="Provide a detailed explanation with references…"
        />
      </Field>

      {/* Sources */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Sources * (at least 1 required)</label>
        {sources.map((src, i) => (
          <div key={i} style={{ border: '1px solid #dee2e6', borderRadius: 4, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select
                value={src.type}
                onChange={e => updateSource(i, { type: e.target.value as CreateSourceInput['type'] })}
                style={{ ...inputStyle, width: 120 }}
              >
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={src.reference}
                onChange={e => updateSource(i, { reference: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="e.g. Al-Baqarah:255, Bukhari:1"
              />
              {sources.length > 1 && (
                <button type="button" onClick={() => removeSource(i)} style={{ ...btnStyle, background: '#dc3545' }}>
                  ✕
                </button>
              )}
            </div>
            <textarea
              value={src.detail ?? ''}
              onChange={e => updateSource(i, { detail: e.target.value })}
              rows={2}
              style={inputStyle}
              placeholder="Optional: additional context about this source"
            />
          </div>
        ))}
        <button type="button" onClick={addSource} style={{ ...btnStyle, background: '#6c757d' }}>
          + Add Source
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: 16 }}
      >
        {loading ? 'Saving…' : (initialData ? 'Update Question' : 'Create Question')}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 14,
  fontWeight: 600,
  color: '#495057',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ced4da',
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};
