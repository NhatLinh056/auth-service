import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
}) => {
  const { lang } = useLanguage();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers array with ellipses
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (safePage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
    return pages;
  };

  return (
    <div
      className="pagination-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-subtle, #1e293b)',
        fontSize: 13,
        color: 'var(--text-muted, #94a3b8)',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      {/* Left: Range & Total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span>
          {lang === 'vi'
            ? `Hiển thị ${startItem} - ${endItem} trên tổng số ${totalItems} mục`
            : `Showing ${startItem} - ${endItem} of ${totalItems} items`}
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{lang === 'vi' ? 'Số dòng:' : 'Per page:'}</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="pagination-pagesize-select"
              style={{
                background: 'var(--bg-surface-elevated, #1a2234)',
                border: '1px solid var(--border-medium, #334155)',
                color: '#fff',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              id="pagination-page-size"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} {lang === 'vi' ? 'dòng' : 'rows'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Previous Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={disabled || safePage <= 1}
          style={{ padding: '4px 10px', minWidth: 32 }}
          title={lang === 'vi' ? 'Trang trước' : 'Previous page'}
          id="pagination-btn-prev"
        >
          &lt;
        </button>

        {/* Numbered Page Buttons */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{ padding: '0 6px', color: 'var(--text-dim)' }}
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === safePage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onPageChange(pageNum)}
              disabled={disabled}
              style={{
                padding: '4px 10px',
                minWidth: 32,
                fontWeight: isActive ? 700 : 500,
              }}
              id={`pagination-btn-page-${pageNum}`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={disabled || safePage >= totalPages}
          style={{ padding: '4px 10px', minWidth: 32 }}
          title={lang === 'vi' ? 'Trang sau' : 'Next page'}
          id="pagination-btn-next"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
