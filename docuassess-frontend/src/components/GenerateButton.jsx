export default function GenerateButton({ onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '16px 32px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: disabled || loading
          ? 'var(--color-surface-alt)'
          : 'linear-gradient(135deg, var(--color-primary), #5B4CD8)',
        color: disabled ? 'var(--color-text-muted)' : '#fff',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: disabled || loading ? 'none' : 'var(--shadow-glow)',
        letterSpacing: '0.3px',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 0 28px rgba(124, 108, 255, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = disabled || loading ? 'none' : 'var(--shadow-glow)';
      }}
    >
      {loading ? (
        <>
          <div
            style={{
              width: 20,
              height: 20,
              border: '2.5px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          Generating questions…
        </>
      ) : (
        <>
          Generate questions
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </button>
  );
}
