import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { uploadFile } from '../api/client';
import FileUploader from '../components/FileUploader';
import ErrorBanner from '../components/ErrorBanner';

export default function UploadPage() {
  const navigate = useNavigate();
  const { setFile } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = useCallback(async (file) => {
    if (loading) return; // prevent duplicate uploads

    setLoading(true);
    setError(null);

    try {
      const data = await uploadFile(file);

      // Store file info in context
      setFile(data.fileId, {
        originalName: data.meta.originalName,
        sizeMb: data.meta.sizeMb,
        uploadedAt: data.meta.uploadedAt,
        pageCount: data.meta.pageCount,
        charCount: data.meta.charCount,
        chunks: data.meta.chunks,
      });

      toast.success('File uploaded successfully');

      // Show warning if partial extraction
      if (data.warning) {
        toast(data.warning, { icon: '⚠️', duration: 5000 });
      }

      navigate('/configure');
    } catch (err) {
      setError(err.message || 'Upload failed');
      toast.error('Upload failed');
      setLoading(false);
    }
  }, [loading, setFile, navigate]);

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        gap: '24px',
      }}
    >
      {/* Hero text */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Generate assessment questions
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>
          Upload a PDF document and let AI create questions automatically
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ width: '100%', maxWidth: '560px' }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Uploader */}
      <FileUploader onUpload={handleUpload} loading={loading} />

      {/* Footer info */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
        {[
          { icon: '📄', text: 'PDF format' },
          { icon: '🤖', text: 'AI-powered' },
          { icon: '⚡', text: 'Instant results' },
        ].map((item) => (
          <div
            key={item.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
