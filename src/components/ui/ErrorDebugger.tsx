import { useState, useEffect } from 'react';

/**
 * Diagnostic tool to show any top-level JS errors directly on the user's screen.
 * Since we can't see the console, this is our "eye".
 */
export default function ErrorDebugger() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setError(`${e.message}\n${e.filename}:${e.lineno}`);
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      setError(`Promise Rejection: ${e.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!error) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 20,
      background: 'rgba(255, 0, 0, 0.95)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      zIndex: 99999,
      fontFamily: 'monospace',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      overflow: 'auto',
      pointerEvents: 'all'
    }}>
      <h2 style={{ margin: '0 0 10px 0' }}>🚨 RUNTIME ERROR DETECTED</h2>
      {error}
      <button 
        onClick={() => setError(null)}
        style={{
          marginTop: '20px',
          padding: '8px 16px',
          background: 'white',
          color: 'red',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        DISMISS
      </button>
    </div>
  );
}
