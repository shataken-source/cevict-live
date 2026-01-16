'use client';

interface LoadingSkeletonProps {
  type?: 'pet-card' | 'text' | 'image';
  count?: number;
}

export default function LoadingSkeleton({ type = 'pet-card', count = 1 }: LoadingSkeletonProps) {
  if (type === 'pet-card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '200px',
                background: '#e5e7eb'
              }}
            />
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  height: '20px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  width: '60%'
                }}
              />
              <div
                style={{
                  height: '16px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  width: '80%'
                }}
              />
              <div
                style={{
                  height: '16px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  width: '40%'
                }}
              />
            </div>
          </div>
        ))}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </>
    );
  }

  if (type === 'text') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              height: '16px',
              background: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '8px',
              width: i === count - 1 ? '60%' : '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        ))}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        background: '#e5e7eb',
        borderRadius: '8px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
    >
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

