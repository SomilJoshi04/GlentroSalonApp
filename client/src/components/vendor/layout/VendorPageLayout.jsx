import React from 'react';

const VendorPageLayout = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col w-full animate-fade-in ${className}`}>
      {children}
    </div>
  );
};
export default VendorPageLayout;
