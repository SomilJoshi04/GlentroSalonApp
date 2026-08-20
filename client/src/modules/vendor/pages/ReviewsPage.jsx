import { useState, useEffect } from 'react';
import { getVendorReviews } from '../services/vendorApi';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';
import VendorTableContainer from '../../../components/vendor/layout/VendorTableContainer';
import VendorPagination from '../../../components/vendor/layout/VendorPagination';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  useEffect(() => {
    loadReviews(pagination.page);
  }, []);

  const loadReviews = async (page = 1) => {
    try {
      const res = await getVendorReviews({ page, limit: pagination.limit });
      setReviews(res.data.data);
      if (res.data.pagination) {
        setPagination(prev => ({ ...prev, page: res.data.pagination.page, total: res.data.pagination.total, totalPages: res.data.pagination.pages }));
      }
    } catch (error) {
      console.error('Failed to load reviews', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <VendorPageLayout>
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      </VendorPageLayout>
    );
  }

  return (
    <VendorPageLayout>
      <VendorPageHeader 
        title="Salon Reviews"
        description="See what your customers are saying about your salons."
      />

      <VendorTableContainer isCardGrid={true}>
        {reviews.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">reviews</span>
            <h3 className="text-lg font-semibold text-on-surface">No reviews found</h3>
            <p className="text-muted-text text-sm mt-1">Customer reviews will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div key={review._id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div>
                      <h3 className="font-bold text-on-surface text-[15px]">{review.salon?.name || 'Unknown Salon'}</h3>
                      <p className="text-[11px] text-muted-text mt-0.5">By <span className="font-medium text-on-surface">{review.user?.name || 'Customer'}</span> on {new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center text-warning shrink-0 gap-0.5 bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                      <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="text-[11px] font-bold">{review.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                  
                  {review.comment && (
                    <p className="text-sm text-on-surface mt-3 bg-surface-variant p-3.5 rounded-xl border border-border italic line-clamp-4">"{review.comment}"</p>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-[10px] text-muted-text font-medium uppercase tracking-wider">
                  <span>Booking: #{review.booking?._id?.slice(-6).toUpperCase() || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </VendorTableContainer>
      
      {reviews.length > 0 && (
        <VendorPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={loadReviews}
        />
      )}
    </VendorPageLayout>
  );
};

export default ReviewsPage;
