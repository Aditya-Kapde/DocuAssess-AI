export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        padding: '14px 20px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-red-muted)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: 'var(--color-red)',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="14" r="0.75" fill="currentColor" />
      </svg>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 4px',
            opacity: 0.7,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
