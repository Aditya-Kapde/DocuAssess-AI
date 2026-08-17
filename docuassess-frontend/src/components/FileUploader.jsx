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
      style={{
        width: '100%',
        background: 'linear-gradient(145deg, rgba(30, 30, 50, 0.6) 0%, rgba(20, 20, 35, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '8px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          position: 'relative',
          width: '100%',
          padding: '60px 40px',
          borderRadius: '16px',
          border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'rgba(124, 108, 255, 0.2)'}`,
          background: dragActive ? 'rgba(124, 108, 255, 0.05)' : 'transparent',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          textAlign: 'center',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading && !dragActive) {
            e.currentTarget.style.borderColor = 'rgba(124, 108, 255, 0.5)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
          }
        }}
        onMouseLeave={(e) => {
          if (!dragActive) {
            e.currentTarget.style.borderColor = 'rgba(124, 108, 255, 0.2)';
            e.currentTarget.style.background = 'transparent';
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  border: '3px solid rgba(124, 108, 255, 0.1)',
                  borderRadius: '50%',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  border: '3px solid transparent',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                Analyzing Document
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Extracting text, images, and context...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Upload Icon with Glow */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                background: 'var(--color-primary)',
                filter: 'blur(30px)',
                opacity: 0.4,
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                background: 'rgba(124, 108, 255, 0.1)',
                border: '1px solid rgba(124, 108, 255, 0.2)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.05)'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#primaryGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A5B4FC" />
                      <stop offset="100%" stopColor="#7C6CFF" />
                    </linearGradient>
                  </defs>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Upload your PDF
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
              Drag and drop your file here or click to browse your computer
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 32px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #5b4ae6 100%)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(124, 108, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 108, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 108, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
              }}
            >
              Browse Files
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '20px' }}>
              Maximum file size: 20MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
