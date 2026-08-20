import React from 'react';

const AdminPageHeader = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
      <div>
        <h1 className="font-headline-md text-[24px] sm:text-[28px] text-on-surface font-bold">
          {title}
        </h1>
        {description && (
          <p className="font-body-md text-muted-text mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
export default AdminPageHeader;
