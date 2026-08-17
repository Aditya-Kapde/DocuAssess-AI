import { useState } from 'react';
import { TYPE_LABELS, TYPE_COLORS } from '../utils/questionTypes';

export default function AccordionSection({ type, questions, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = TYPE_COLORS[type] || TYPE_COLORS.mcq;
  const label = TYPE_LABELS[type] || type;
  const count = Array.isArray(questions) ? questions.length : 0;

  return (
    <div
      className="accordion-container animate-fade-in"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${open ? color.border : 'var(--color-border)'}`,
        background: open ? 'rgba(255, 255, 255, 0.02)' : 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        transition: 'all var(--transition)',
        boxShadow: open ? `0 8px 32px ${color.border}20` : 'none',
      }}
    >
      {/* Header */}
      <button
        className="accordion-button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '4px',
              height: '24px',
              borderRadius: '2px',
              background: open ? color.text : 'transparent',
              transition: 'background var(--transition)',
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '0.3px',
              color: open ? color.text : 'var(--color-text)',
            }}
          >
            {label}
          </span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: open ? color.bg : 'var(--color-surface)',
              color: open ? color.text : 'var(--color-text-muted)',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: open ? `0 0 10px ${color.bg}` : 'none',
              transition: 'all var(--transition)',
            }}
          >
            {count}
          </span>
        </div>

        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            color: open ? color.text : 'var(--color-text-muted)',
          }}
        >
          <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`accordion-content ${open ? 'animate-slide-down' : ''}`}
        style={{
          padding: '0 24px 24px',
          display: open ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {(questions || []).map((q, i) => (
          <QuestionItem key={i} type={type} question={q} index={i + 1} color={color} label={label} />
        ))}
      </div>
    </div>
  );
}

/* ── Individual Question Renderer ────────────────────────── */
/* ── Helpers ─────────────────────────────────────────────── */
const getQuestionText = (q) =>
  typeof q === 'object' && q !== null ? q?.text || '' : q || '';

const QuestionImage = ({ question: q }) => {
  const [isOpen, setIsOpen] = useState(false);
  const img = typeof q === "object" && q !== null ? q?.image : null;

  if (!img) return null;

  const backend =
    (import.meta.env.VITE_API_BASE || "http://localhost:5000/api/v1")
      .replace("/api/v1", "");

  const imageUrl = `${backend}/${img}`;

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        style={{ margin: '16px 0', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'inline-block', cursor: 'zoom-in', transition: 'transform 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img
          src={imageUrl}
          alt="Visual reference"
          style={{
            maxWidth: "100%",
            maxHeight: "350px",
            borderRadius: "4px",
            objectFit: "contain"
          }}
        />
      </div>
      
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="no-print animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '40px'
          }}
        >
          <img 
            src={imageUrl} 
            alt="Visual reference enlarged" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain', 
              borderRadius: '8px', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)' 
            }} 
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

function QuestionItem({ type, question, index, color, label }) {
  const cardStyle = {
    padding: '24px',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(30, 30, 50, 0.4)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  };

  const questionNumStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  };

  const badgeStyle = {
    fontSize: '12px',
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: '6px',
    background: color.bg,
    color: color.text,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const printTypeStyle = {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  };

  const questionTextStyle = {
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.6,
    color: 'var(--color-text)',
    marginBottom: '20px',
  };

  switch (type) {
    case 'mcq':
    case 'diagram_mcq':
    case 'graph_analysis':
    case 'label_identification':
      return (
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.options?.map((opt, i) => {
              const isCorrect = opt === question.answer;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCorrect ? 'var(--color-green-muted)' : 'var(--color-surface)',
                    border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'transparent'}`,
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: isCorrect ? 'var(--color-green)' : 'var(--color-border)',
                      color: isCorrect ? '#fff' : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-text-secondary)', fontWeight: isCorrect ? 600 : 400 }}>
                    {opt}
                  </span>
                  {isCorrect && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginLeft: 'auto', color: 'var(--color-green)' }}>
                      <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: 'var(--radius-full)', background: question.answer ? 'var(--color-green-muted)' : 'var(--color-red-muted)', border: `1px solid ${question.answer ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}` }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: question.answer ? 'var(--color-green)' : 'var(--color-red)' }}>
              {question.answer ? '✓ TRUE' : '✗ FALSE'}
            </span>
          </div>
        </div>
      );

    case 'fill_blanks':
      return (
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-primary-muted)',
              border: '1px dashed rgba(124, 108, 255, 0.5)',
              fontSize: '14px',
              display: 'inline-block',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', marginRight: '10px', fontWeight: 500 }}>Correct Answer:</span>
            <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{question.answer}</strong>
          </div>
        </div>
      );

    case 'match_following':
      return (
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
            {question.left?.map((item, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {item}
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '18px', fontWeight: 800 }}>→</span>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary-muted)',
                    border: '1px solid rgba(124, 108, 255, 0.3)',
                    fontSize: '14px',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
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
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.correct_order?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--color-blue-muted)',
                    color: 'var(--color-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'multi_select':
      return (
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>{getQuestionText(question.question)}</p>
          <QuestionImage question={question.question} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {question.options?.map((opt, i) => {
              const isCorrect = question.answers?.includes(opt);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCorrect ? 'var(--color-green-muted)' : 'var(--color-surface)',
                    border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'transparent'}`,
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 800,
                      background: isCorrect ? 'var(--color-green)' : 'var(--color-border)',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {isCorrect ? '✓' : ''}
                  </span>
                  <span style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-text-secondary)', fontWeight: isCorrect ? 600 : 400 }}>
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
        <div className="question-item" style={cardStyle}>
          <div style={questionNumStyle}>
            <span style={badgeStyle}>Q{index}</span>
            <span className="print-only" style={{ display: 'none', ...printTypeStyle }}>{label}</span>
          </div>
          <p style={questionTextStyle}>Raw Output (Unsupported Type)</p>
          <pre style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            {JSON.stringify(question, null, 2)}
          </pre>
        </div>
      );
  }
}
