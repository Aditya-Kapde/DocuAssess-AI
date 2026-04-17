import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { generateQuestions } from '../api/client';
import FileCard from '../components/FileCard';
import MetadataBadges from '../components/MetadataBadges';
import QuestionTypeSelector from '../components/QuestionTypeSelector';
import SliderInput from '../components/SliderInput';
import GenerateButton from '../components/GenerateButton';
import ErrorBanner from '../components/ErrorBanner';

export default function ConfigurePage() {
  const navigate = useNavigate();
  const {
    fileId, fileMeta,
    selectedTypes, toggleType,
    countPerType, setCount,
    setResults,
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guard: redirect to upload if no file
  useEffect(() => {
    if (!fileId) navigate('/', { replace: true });
  }, [fileId, navigate]);

  const handleGenerate = useCallback(async () => {
    if (loading || !fileId || selectedTypes.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const data = await generateQuestions({
        fileId,
        questionTypes: selectedTypes,
        count: countPerType,
      });

      if (data.success) {
        setResults({ questions: data.questions, meta: data.meta });
        navigate('/results');
      } else {
        const errMsg = data.error?.message || 'Generation failed';
        setError(errMsg);
        toast.error('Failed to generate questions');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate questions');
      toast.error('Failed to generate questions');
      setLoading(false);
    }
  }, [loading, fileId, selectedTypes, countPerType, setResults, navigate]);

  if (!fileId) return null;

  const isDisabled = selectedTypes.length === 0;

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.3px', marginBottom: '6px' }}>
          Configure generation
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Select question types and count, then generate
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: '20px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* ── Left Column: File Info ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FileCard fileMeta={fileMeta} />
          <MetadataBadges fileMeta={fileMeta} />
        </div>

        {/* ── Right Column: Config ────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <QuestionTypeSelector selectedTypes={selectedTypes} onToggle={toggleType} />
          <SliderInput value={countPerType} onChange={setCount} />
          <GenerateButton
            onClick={handleGenerate}
            disabled={isDisabled}
            loading={loading}
          />
          {isDisabled && !loading && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '-16px' }}>
              Select at least one question type to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
