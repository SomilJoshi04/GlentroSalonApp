import React from 'react';

const AdminListToolbar = ({ children }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm mb-6 shrink-0">
      {children}
    </div>
  );
};
export default AdminListToolbar;
