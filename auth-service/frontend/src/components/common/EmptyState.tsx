import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`empty-state-container ${className}`}
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="empty-state-icon"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--bg-surface-elevated, #1a2234)',
          border: '1px solid var(--border-subtle, #1e293b)',
          color: 'var(--text-dim, #64748b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {icon || (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M10 4v4" />
            <path d="M2 8h20" />
            <path d="M6 4v4" />
          </svg>
        )}
      </div>

      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-main)',
          margin: '0 0 6px',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted, #94a3b8)',
            maxWidth: 440,
            margin: '0 0 18px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
