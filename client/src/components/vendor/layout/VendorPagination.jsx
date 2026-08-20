import React from 'react';
import Pagination from '../../common/Pagination';

const VendorPagination = (props) => {
  return (
    <div className={`shrink-0 bg-surface border-t border-border mt-3 pt-3 pb-1 ${props.className || ''}`}>
      <Pagination {...props} />
    </div>
  );
};
export default VendorPagination;
