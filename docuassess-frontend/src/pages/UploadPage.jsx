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
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '40px 20px',
        overflow: 'hidden',
      }}
    >
      {/* Background Orbs */}
      <div 
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(124, 108, 255, 0.15) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.1) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Enterprise Badge */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '6px 16px', 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', boxShadow: '0 0 10px var(--color-primary)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>DocuAssess AI Engine 2.0</span>
        </div>

        {/* Hero text */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 800, 
            letterSpacing: '-1px', 
            lineHeight: 1.1,
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Generate Intelligent <br /> Assessments Instantly
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
            Upload your training manuals, documentation, or textbooks and let our AI engine craft professional, print-ready questions in seconds.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ width: '100%', marginBottom: '24px' }}>
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Uploader */}
        <FileUploader onUpload={handleUpload} loading={loading} />

        {/* Features Row */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '📄', title: 'PDF Support', desc: 'Up to 20MB files' },
            { icon: '🧠', title: 'Context-Aware AI', desc: 'Deep document analysis' },
            { icon: '⚡', title: 'Rapid Generation', desc: 'Questions in seconds' },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px 20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                minWidth: '180px',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
