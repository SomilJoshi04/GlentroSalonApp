import React from 'react';

const AdminPageLayout = ({ children, className = '' }) => {
  return (
    <div className={`flex-1 flex flex-col min-h-0 min-w-0 w-full animate-fade-in ${className}`}>
      {children}
    </div>
  );
};
export default AdminPageLayout;
