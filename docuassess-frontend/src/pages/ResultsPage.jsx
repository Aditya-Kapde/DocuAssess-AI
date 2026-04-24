import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
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

  {/* Back to configure */}
  <div
    style={{
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: 'center',
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
  </div>
</div>

);
}
