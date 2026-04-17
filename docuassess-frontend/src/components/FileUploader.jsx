import { useState, useRef, useCallback } from 'react';

export default function FileUploader({ onUpload, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (loading) return;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  }, [onUpload, loading]);

  const handleChange = useCallback((e) => {
    if (loading) return;
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }, [onUpload, loading]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        padding: '64px 40px',
        borderRadius: 'var(--radius-lg)',
        border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: dragActive ? 'var(--color-primary-muted)' : 'var(--color-surface)',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition)',
        textAlign: 'center',
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading && !dragActive) {
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          e.currentTarget.style.background = 'var(--color-surface-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!dragActive) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.background = 'var(--color-surface)';
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        disabled={loading}
        style={{ display: 'none' }}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
            Uploading & extracting...
          </p>
        </div>
      ) : (
        <>
          {/* Upload Icon */}
          <div style={{ marginBottom: '20px' }}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto' }}>
              <rect width="56" height="56" rx="16" fill="var(--color-primary-muted)" />
              <path
                d="M28 18V38M28 18L22 24M28 18L34 24"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18 32V36C18 37.1046 18.8954 38 20 38H36C37.1046 38 38 37.1046 38 36V32"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Upload a PDF to generate questions
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Drag & drop your file here, or click to browse
          </p>
          <div
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all var(--transition)',
            }}
          >
            Choose PDF
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
            PDF only · Max 20MB
          </p>
        </>
      )}
    </div>
  );
}
