export default function MetadataBadges({ fileMeta }) {
  if (!fileMeta) return null;

  const badges = [
    { label: 'Pages', value: fileMeta.pageCount, icon: '📑' },
    { label: 'Characters', value: fileMeta.charCount?.toLocaleString(), icon: '🔤' },
    fileMeta.chunks && { label: 'Chunks', value: fileMeta.chunks.count, icon: '🧩' },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span>{badge.icon}</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{badge.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{badge.value}</span>
        </div>
      ))}

      {/* Extra info badges */}
      {fileMeta.chunks && (
        <div
          style={{
            width: '100%',
            marginTop: '6px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <div>Avg chunk words: <strong style={{ color: 'var(--color-text)' }}>{fileMeta.chunks.averageWordCount}</strong></div>
          <div>Estimated coverage: <strong style={{ color: 'var(--color-green)' }}>full doc</strong></div>
        </div>
      )}
    </div>
  );
}
