import React from 'react';

interface StatusPillProps {
  label: string;
  variant?: 'default' | 'success';
}

export const StatusPill: React.FC<StatusPillProps> = ({ label, variant = 'default' }) => {
  const className = variant === 'success' ? 'status-pill status-pill-success' : 'status-pill';
  return (
    <div className={className}>
      <span className="status-dot"></span>
      <span>{label}</span>
    </div>
  );
};
