import React from 'react';

interface StatusPillProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const StatusPill: React.FC<StatusPillProps> = ({ label, variant = 'default' }) => {
  const variantClass = variant === 'default' ? '' : ` status-pill-${variant}`;
  return (
    <div className={`status-pill${variantClass}`} role="status">
      <span className="status-dot" aria-hidden="true"></span>
      <span>{label}</span>
    </div>
  );
};
