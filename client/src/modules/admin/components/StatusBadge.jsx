import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalizedStatus = status.toLowerCase();
  
  const statusStyles = {
    // Active/Approved
    active: 'bg-success/10 text-success',
    approved: 'bg-success/10 text-success',
    completed: 'bg-success/10 text-success',
    
    // Pending
    pending: 'bg-warning/10 text-warning-dark',
    'pending approval': 'bg-warning/10 text-warning-dark',
    
    // Inactive/Suspended/Rejected
    inactive: 'bg-surface-variant text-muted-text border border-border',
    suspended: 'bg-error/10 text-error',
    rejected: 'bg-error/10 text-error',
    cancelled: 'bg-error/10 text-error',
  };

  const getStyle = (s) => statusStyles[s] || 'bg-surface-variant text-muted-text border border-border';

  const style = getStyle(normalizedStatus);

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-[12px] whitespace-nowrap capitalize ${style}`}>
      {normalizedStatus === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>}
      {normalizedStatus === 'inactive' && <span className="w-1.5 h-1.5 rounded-full bg-muted-text mr-1.5"></span>}
      {status}
    </span>
  );
};

export default StatusBadge;
