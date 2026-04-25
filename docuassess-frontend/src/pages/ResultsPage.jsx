import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { exportQuestions } from '../api/client';
import AccordionSection from '../components/AccordionSection';
import { TYPE_LABELS } from '../utils/questionTypes';

export default function ResultsPage() {
const navigate = useNavigate();
const { results, fileMeta } = useAppContext();

// Guard: redirect to upload if no results
useEffect(() => {
if (!results) navigate('/', { replace: true });
}, [results, navigate]);

if (!results) return null;

const { questions, meta } = results;

// ✅ FIX: Group flat array into { type: [] }
const groupedQuestions = (questions || []).reduce((acc, q) => {
if (!acc[q.type]) acc[q.type] = [];
acc[q.type].push(q);
return acc;
}, {});

const questionTypes = Object.keys(groupedQuestions);
const totalQuestions = questions?.length || 0;

// ── Export state ──────────────────────────────────────────
const [exporting, setExporting] = useState(false);
const [exportError, setExportError] = useState(null);

const handleExport = async () => {
  setExporting(true);
  setExportError(null);
  try {
    await exportQuestions(questions);
  } catch (err) {
    setExportError(err.message);
  } finally {
    setExporting(false);
  }
};

return ( <div className="animate-fade-in">
{/* Header */}
<div style={{ marginBottom: '32px' }}>
<h1
style={{
fontSize: '26px',
fontWeight: 700,
letterSpacing: '-0.3px',
marginBottom: '6px',
}}
>
Generated questions </h1>
<p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
{totalQuestions} questions from{' '} <strong>{fileMeta?.originalName || 'your document'}</strong> </p> </div>

```
  {/* Meta summary bar */}
  {meta && (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '28px',
      }}
    >
      {[
        { label: 'Chunks used', value: `${meta.usedChunks}/${meta.totalChunks}` },
        meta.validation && { label: 'Valid', value: meta.validation.validCount },
        meta.validation &&
          meta.validation.invalidCount > 0 && {
            label: 'Invalid',
            value: meta.validation.invalidCount,
            warn: true,
          },
        { label: 'Truncated', value: meta.truncated ? 'Yes' : 'No' },
      ]
        .filter(Boolean)
        .map((item) => (
          <div
            key={item.label}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: item.warn
                ? 'var(--color-gold-muted)'
                : 'var(--color-surface-alt)',
              border: `1px solid ${
                item.warn
                  ? 'rgba(212, 160, 23, 0.3)'
                  : 'var(--color-border)'
              }`,
              fontSize: '13px',
            }}
          >
            <span
              style={{
                color: 'var(--color-text-muted)',
                marginRight: '6px',
              }}
            >
              {item.label}
            </span>
            <strong
              style={{
                color: item.warn
                  ? 'var(--color-gold)'
                  : 'var(--color-text)',
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
    </div>
  )}

  {/* Question sections */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {questionTypes.length > 0 ? (
      questionTypes.map((type, i) => (
        <AccordionSection
          key={type}
          type={type}
          questions={groupedQuestions[type]} // ✅ FIXED
          defaultOpen={i === 0}
        />
      ))
    ) : (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-text-muted)',
            marginBottom: '8px',
          }}
        >
          No questions were generated
        </p>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          The document may not have enough content for the selected question
          types.
        </p>
      </div>
    )}
  </div>

  {/* Action buttons */}
  <div
    style={{
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}
  >
    <button
      onClick={() => navigate('/configure')}
      style={{
        padding: '12px 28px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-text)',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all var(--transition)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.color = 'var(--color-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
    >
      ← Reconfigure
    </button>

    {totalQuestions > 0 && (
      <button
        id="export-questions-btn"
        onClick={handleExport}
        disabled={exporting}
        style={{
          padding: '12px 28px',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          background: exporting
            ? 'var(--color-surface-alt)'
            : 'linear-gradient(135deg, var(--color-primary), #9B8CFF)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          cursor: exporting ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition)',
          boxShadow: exporting ? 'none' : 'var(--shadow-glow)',
          opacity: exporting ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (!exporting) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 0 28px rgba(124, 108, 255, 0.35)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
        }}
      >
        {exporting ? (
          <>
            <span
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                display: 'inline-block',
              }}
            />
            Exporting…
          </>
        ) : (
          '↓ Export Questions'
        )}
      </button>
    )}
  </div>

  {/* Export error feedback */}
  {exportError && (
    <p
      style={{
        textAlign: 'center',
        marginTop: '12px',
        fontSize: '13px',
        color: 'var(--color-red)',
      }}
    >
      Export failed: {exportError}
    </p>
  )}
</div>

);
}
