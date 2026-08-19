import { useState, useEffect } from 'react';
import { getVendorReviews } from '../services/vendorApi';
import PageHeader from '../../../components/common/PageHeader';
import Loader from '../../../components/common/Loader';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const res = await getVendorReviews();
      setReviews(res.data.data);
    } catch (error) {
      console.error('Failed to load reviews', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading reviews..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Salon Reviews" />

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No reviews found for your salons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{review.salon?.name || 'Unknown Salon'}</h3>
                  <p className="text-xs text-gray-500">By {review.user?.name || 'Customer'} on {new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className="material-symbols-outlined text-sm" 
                      style={{fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0"}}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>
              
              {review.comment && (
                <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-lg">"{review.comment}"</p>
              )}
              
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                <span>Booking ID: #{review.booking?._id?.slice(-6).toUpperCase() || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
