import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { exportQuestions } from '../api/client';
import AccordionSection from '../components/AccordionSection';
import { TYPE_LABELS } from '../utils/questionTypes';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { results, fileMeta } = useAppContext();

  useEffect(() => {
    if (!results) navigate('/', { replace: true });
  }, [results, navigate]);

  if (!results) return null;

  const { questions, meta } = results;

  const groupedQuestions = (questions || []).reduce((acc, q) => {
    if (!acc[q.type]) acc[q.type] = [];
    acc[q.type].push(q);
    return acc;
  }, {});

  const questionTypes = Object.keys(groupedQuestions);
  const totalQuestions = questions?.length || 0;

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportQuestions(questions);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Stunning Header (Hidden on Print) */}
      <div 
        className="no-print" 
        style={{ 
          marginBottom: '40px',
          padding: '40px',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(30,30,50,0.6) 0%, rgba(20,20,35,0.8) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                marginBottom: '10px',
                background: 'linear-gradient(90deg, #fff, #9B8CFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Assessment Ready
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Generated <strong style={{ color: '#fff' }}>{totalQuestions}</strong> questions from{' '}
              <strong style={{ color: 'var(--color-primary)', background: 'rgba(124, 108, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                {fileMeta?.originalName || 'your document'}
              </strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/configure')}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              ← Reconfigure
            </button>
            
            {totalQuestions > 0 && (
              <button
                onClick={handlePrintPdf}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(13, 148, 136, 0.3)',
                  background: 'rgba(13, 148, 136, 0.1)',
                  color: 'var(--color-teal)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(13, 148, 136, 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(13, 148, 136, 0.1)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Download PDF
              </button>
            )}

            {totalQuestions > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: exporting ? 'var(--color-surface-alt)' : 'linear-gradient(135deg, var(--color-primary), #9B8CFF)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition)',
                  boxShadow: exporting ? 'none' : '0 8px 24px rgba(124, 108, 255, 0.3)',
                  opacity: exporting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { if (!exporting) e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {exporting ? 'Exporting...' : '↓ Export JSON'}
              </button>
            )}
          </div>
        </div>

        {/* Meta summary bar */}
        {meta && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            {[
              { label: 'Chunks used', value: `${meta.usedChunks}/${meta.totalChunks}` },
              meta.validation && { label: 'Valid', value: meta.validation.validCount },
              meta.validation &&
                meta.validation.invalidCount > 0 && {
                  label: 'Invalid',
                  value: meta.validation.invalidCount,
                  warn: true,
                },
              { label: 'Truncated', value: meta.truncated ? 'Yes' : 'No' },
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: item.warn ? 'rgba(212, 160, 23, 0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${item.warn ? 'rgba(212, 160, 23, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)', marginRight: '6px' }}>{item.label}</span>
                  <strong style={{ color: item.warn ? 'var(--color-gold)' : '#fff' }}>{item.value}</strong>
                </div>
              ))}
          </div>
        )}
        
        {exportError && (
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-red)', fontWeight: 500 }}>
            Export failed: {exportError}
          </p>
        )}
      </div>

      {/* Print-only Header (Visible only when generating PDF) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Assessment: {fileMeta?.originalName || 'Document'}</h1>
        <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Generated by DocuAssess AI</p>
      </div>

      {/* Question sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {questionTypes.length > 0 ? (
          questionTypes.map((type, i) => (
            <AccordionSection
              key={type}
              type={type}
              questions={groupedQuestions[type]}
              defaultOpen={i === 0}
            />
          ))
        ) : (
          <div
            className="no-print"
            style={{
              padding: '60px',
              textAlign: 'center',
              borderRadius: '24px',
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
              No questions were generated
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              The document may not have enough content for the selected question types.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
