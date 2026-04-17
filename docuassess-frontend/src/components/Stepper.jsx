import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const steps = [
  { key: 'upload', label: 'Upload', path: '/' },
  { key: 'configure', label: 'Configure', path: '/configure' },
  { key: 'results', label: 'Results', path: '/results' },
];

export default function Stepper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileId, results } = useAppContext();

  const currentIndex = steps.findIndex((s) => s.path === location.pathname);

  function canNavigate(index) {
    if (index === 0) return true;
    if (index === 1) return !!fileId;
    if (index === 2) return !!results;
    return false;
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        const clickable = canNavigate(i);

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {i > 0 && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.4 }}>
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <button
              onClick={() => clickable && navigate(step.path)}
              disabled={!clickable}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isActive
                  ? 'var(--color-primary-muted)'
                  : 'transparent',
                color: isActive
                  ? 'var(--color-primary)'
                  : isCompleted
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'var(--font-sans)',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'all var(--transition)',
                opacity: clickable ? 1 : 0.5,
              }}
            >
              {isCompleted && '✓ '}{step.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
