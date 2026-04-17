import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Stepper from './Stepper';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { reset, fileId } = useAppContext();

  function handleNewFile() {
    reset();
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ─────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            D
          </div>
          <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            DocuAssess AI
          </span>
        </div>

        {/* Stepper */}
        <Stepper />

        {/* New File button */}
        {fileId && (
          <button
            onClick={handleNewFile}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: '13px',
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
            + New file
          </button>
        )}
      </header>

      {/* ── Main Content ───────────────────────────── */}
      <main style={{ flex: 1, padding: '40px 32px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
