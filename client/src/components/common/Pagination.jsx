import React from 'react';

const Pagination = ({ currentPage = 1, totalPages = 1, total = 0, limit = 10, onPageChange }) => {
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * limit + 1;
  const endIdx = Math.min(currentPage * limit, total);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        end = 5;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 4;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-variant/10 rounded-b-2xl">
      <p className="font-body-sm text-[13px] text-text-muted">
        Showing <span className="font-semibold text-text-primary">{startIdx}</span> to{' '}
        <span className="font-semibold text-text-primary">{endIdx}</span> of{' '}
        <span className="font-semibold text-text-primary">{total}</span> results
      </p>
      
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-xl border border-border text-text-muted hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center"
          aria-label="Previous Page"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        {getPageNumbers().map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-90 ${
              currentPage === pageNum
                ? 'bg-primary text-white border border-primary/20 shadow-sm'
                : 'text-text-secondary hover:bg-surface border border-transparent'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-xl border border-border text-text-muted hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center"
          aria-label="Next Page"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
