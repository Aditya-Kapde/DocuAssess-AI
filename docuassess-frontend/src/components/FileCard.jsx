export default function FileCard({ fileMeta }) {
  if (!fileMeta) return null;

  const uploadTime = fileMeta.uploadedAt
    ? new Date(fileMeta.uploadedAt).toLocaleString()
    : 'Just now';

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, #1E3A5F, #1A2744)',
        padding: '24px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* File icon + name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          📄
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {fileMeta.originalName}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Uploaded {uploadTime}
          </p>
        </div>
      </div>

      {/* Size */}
      <div
        style={{
          marginTop: '16px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.05)',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
        }}
      >
        {fileMeta.sizeMb} MB
      </div>
    </div>
  );
}
