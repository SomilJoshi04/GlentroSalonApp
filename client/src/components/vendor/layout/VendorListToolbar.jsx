import React from 'react';

const VendorListToolbar = ({ children, className = '' }) => {
  return (
    <div className={`shrink-0 flex flex-col sm:flex-row gap-3 bg-surface p-3 sm:p-4 rounded-xl border border-border shadow-sm mb-4 ${className}`}>
      {children}
    </div>
  );
};
export default VendorListToolbar;
