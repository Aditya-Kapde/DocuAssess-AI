import { QUESTION_TYPES } from '../utils/questionTypes';

export default function QuestionTypeSelector({ selectedTypes, onToggle }) {
  return (
    <div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-text)' }}>
        Question types
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {QUESTION_TYPES.map(({ key, label, icon }) => {
          const isSelected = selectedTypes.includes(key);
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-full)',
                border: isSelected
                  ? '1.5px solid var(--color-primary)'
                  : '1.5px solid var(--color-border)',
                background: isSelected
                  ? 'var(--color-primary-muted)'
                  : 'var(--color-surface)',
                color: isSelected
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: isSelected ? 600 : 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.background = 'var(--color-surface)';
                }
              }}
            >
              <span style={{ fontSize: '15px' }}>{icon}</span>
              {label}
              {isSelected && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
