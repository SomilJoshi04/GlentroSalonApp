import React from 'react';
import Loader from '../../../components/common/Loader';

const DataTable = ({ columns, data, loading, error, pagination, onPageChange }) => {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
      <div className="overflow-auto flex-1 relative">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-surface-variant/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 font-label-md text-[12px] text-muted-text uppercase tracking-wider bg-surface-variant/90 backdrop-blur-sm">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-5">
                      <div className="h-4 bg-surface-variant rounded-lg w-full max-w-[85%]"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-danger">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[48px] text-danger/50">error</span>
                    <p className="font-body-md text-[14px]">{error}</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-muted-text">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[48px] text-border">inbox</span>
                    <p className="font-body-md text-[14px]">No records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-surface-variant/80 transition-colors duration-200">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 align-middle">
                      {col.render ? col.render(row) : <span className="font-body-sm text-[14px] text-on-surface">{row[col.accessor]}</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && data.length > 0 && pagination && (
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface-variant/30">
          <p className="font-body-sm text-[14px] text-muted-text">
            Showing <span className="font-medium text-on-surface">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to <span className="font-medium text-on-surface">{Math.min(pagination.currentPage * pagination.limit, pagination.total)}</span> of <span className="font-medium text-on-surface">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-1.5 rounded-lg border border-border text-muted-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              // Simple logic for showing a few pages
              let pageNum = i + 1;
              if (pagination.totalPages > 5 && pagination.currentPage > 3) {
                 pageNum = pagination.currentPage - 2 + i;
                 if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
              }
              return (
                <button 
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg font-label-sm text-[13px] flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${pagination.currentPage === pageNum ? 'bg-primary/10 text-primary border border-primary/20 font-bold' : 'text-on-surface hover:bg-surface-variant'}`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button 
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-1.5 rounded-lg border border-border text-muted-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
