import { useState } from 'react';
import { TYPE_LABELS, TYPE_COLORS } from '../utils/questionTypes';

export default function AccordionSection({ type, questions, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = TYPE_COLORS[type] || TYPE_COLORS.mcq;
  const label = TYPE_LABELS[type] || type;
  const count = Array.isArray(questions) ? questions.length : 0;

  return (
    <div
      className="animate-fade-in"
      style={{
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${open ? color.border + '40' : 'var(--color-border)'}`,
        overflow: 'hidden',
        transition: 'all var(--transition)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: open ? color.bg : 'var(--color-surface)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all var(--transition)',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--color-surface-hover)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--color-surface)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '15px',
              color: open ? color.text : 'var(--color-text)',
            }}
          >
            {label}
          </span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              background: color.bg,
              color: color.text,
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {count}
          </span>
        </div>

        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition)',
            color: 'var(--color-text-muted)',
          }}
        >
          <path d="M4 7L9 12L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Content */}
      {open && (
        <div
          className="animate-slide-down"
          style={{
            padding: '8px 16px 16px',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {(questions || []).map((q, i) => (
            <QuestionItem key={i} type={type} question={q} index={i + 1} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Question Renderer ────────────────────────── */
/* ── Helpers ─────────────────────────────────────────────── */
const getQuestionText = (q) =>
  typeof q === 'object' && q !== null ? q?.text || '' : q || '';

const QuestionImage = ({ question: q }) => {
  const img = typeof q === 'object' && q !== null ? q?.image : null;
  if (!img) return null;
  return (
    <img
      src={`${process.env.VITE_BASE_URL}/${img}`}
      alt="question"
      style={{
        maxWidth: '300px',
        marginTop: '10px',
        borderRadius: '8px',
      }}
    />
  );
};

function QuestionItem({ type, question, index, color }) {
  const cardStyle = {
    padding: '16px 20px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface-alt)',
    border: '1px solid var(--color-border)',
  };

  const questionNumStyle = {
    fontSize: '12px',
    fontWeight: 700,
    color: color.text,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const questionTextStyle = {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.6,
    color: 'var(--color-text)',
    marginBottom: '14px',
  };

  switch (type) {
    case 'mcq':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options?.map((opt, i) => {
              const isCorrect = opt === question.answer;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCorrect ? 'var(--color-green-muted)' : 'var(--color-surface)',
                    border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-border)'}`,
                    fontSize: '13px',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isCorrect ? 'var(--color-green)' : 'var(--color-border)',
                      color: isCorrect ? '#fff' : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-text-secondary)' }}>
                    {opt}
                  </span>
                  {isCorrect && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', color: 'var(--color-green)' }}>
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'true_false':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <span
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '13px',
              background: question.answer ? 'var(--color-green-muted)' : 'var(--color-red-muted)',
              color: question.answer ? 'var(--color-green)' : 'var(--color-red)',
              border: `1px solid ${question.answer ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            {question.answer ? '✓ TRUE' : '✗ FALSE'}
          </span>
        </div>
      );

    case 'fill_blanks':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-muted)',
              border: '1px solid rgba(124, 108, 255, 0.2)',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', marginRight: '8px' }}>Answer:</span>
            <strong style={{ color: 'var(--color-primary)' }}>{question.answer}</strong>
          </div>
        </div>
      );

    case 'match_following':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
            {question.left?.map((item, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}
                >
                  {item}
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>→</span>
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary-muted)',
                    border: '1px solid rgba(124, 108, 255, 0.2)',
                    fontSize: '13px',
                    color: 'var(--color-primary)',
                    fontWeight: 500,
                    textAlign: 'center',
                  }}
                >
                  {question.answer?.[item] || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'ordering':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {question.correct_order?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--color-blue-muted)',
                    color: 'var(--color-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'multi_select':
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options?.map((opt, i) => {
              const isCorrect = question.answers?.includes(opt);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCorrect ? 'var(--color-green-muted)' : 'var(--color-surface)',
                    border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-border)'}`,
                    fontSize: '13px',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      background: isCorrect ? 'var(--color-green)' : 'var(--color-border)',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {isCorrect ? '✓' : ''}
                  </span>
                  <span style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-text-secondary)' }}>
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );

    default:
      return (
        <div style={cardStyle}>
          <div style={questionNumStyle}>Q{index}</div>
          <pre style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(question, null, 2)}
          </pre>
        </div>
      );
  }
}
