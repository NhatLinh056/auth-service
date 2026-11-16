import React from 'react';
import { SkeletonTable } from './SkeletonTable';
import { EmptyState } from './EmptyState';
import { Pagination, type PaginationProps } from './Pagination';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  pagination?: PaginationProps;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  className = '',
  pagination,
}: DataTableProps<T>): React.ReactElement {
  return (
    <div className={`data-table-card ${className}`} style={{ width: '100%' }}>
      <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                    padding: '12px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-dim, #64748b)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderBottom: '1px solid var(--border-subtle, #1e293b)',
                    whiteSpace: 'nowrap',
                  }}
                  className={col.className}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <SkeletonTable
                    rows={4}
                    columns={columns.length}
                    columnWidths={columns.map((c) => c.width || 'auto')}
                  />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowKey = keyExtractor(row, index);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                      borderBottom: '1px solid var(--border-subtle, #1e293b)',
                    }}
                    className={isClickable ? 'clickable-row' : ''}
                  >
                    {columns.map((col) => {
                      const value = (row as any)[col.key];
                      const renderedContent = col.render ? col.render(row, index) : value;

                      return (
                        <td
                          key={`${rowKey}-${col.key}`}
                          style={{
                            textAlign: col.align || 'left',
                            padding: '14px 16px',
                            fontSize: 13,
                            color: 'var(--text-main, #f8fafc)',
                          }}
                          className={col.className}
                          onClick={(e) => {
                            // If cell contains buttons/actions, stop row click
                            if ((e.target as HTMLElement).closest('button, a, input, select')) {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {renderedContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Optional Integrated Pagination */}
      {pagination && !loading && data.length > 0 && (
        <Pagination {...pagination} />
      )}
    </div>
  );
}

export default DataTable;
