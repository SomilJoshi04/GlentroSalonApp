import React from 'react';

const VendorTableContainer = ({ children, className = '', isCardGrid = false }) => {
  if (isCardGrid) {
    return (
      <div className={`flex-1 overflow-y-auto min-h-0 pr-1 ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`flex-1 overflow-y-auto min-h-0 border border-border bg-surface rounded-xl shadow-sm ${className}`}>
      <div className="min-w-full">
        {children}
      </div>
    </div>
  );
};
export default VendorTableContainer;
