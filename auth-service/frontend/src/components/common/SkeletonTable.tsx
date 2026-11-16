import React from 'react';

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  columnWidths?: (string | number)[];
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 4,
  columns = 4,
  columnWidths,
}) => {
  return (
    <div className="skeleton-table-wrapper" style={{ width: '100%' }}>
      <table className="data-table skeleton-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, cIdx) => (
              <th
                key={`sk-th-${cIdx}`}
                style={{
                  width: columnWidths?.[cIdx] || 'auto',
                  padding: '12px 14px',
                }}
              >
                <div
                  className="skeleton-bar"
                  style={{
                    height: 14,
                    width: '60%',
                    borderRadius: 4,
                    background: 'var(--bg-surface-elevated, #1a2234)',
                    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={`sk-tr-${rIdx}`}>
              {Array.from({ length: columns }).map((_, cIdx) => (
                <td key={`sk-td-${rIdx}-${cIdx}`} style={{ padding: '14px' }}>
                  <div
                    className="skeleton-bar"
                    style={{
                      height: 14,
                      width: cIdx === 0 ? '75%' : cIdx === columns - 1 ? '40%' : '55%',
                      borderRadius: 4,
                      background: 'var(--bg-surface-elevated, #1a2234)',
                      animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${(rIdx * 0.1 + cIdx * 0.05).toFixed(2)}s`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
