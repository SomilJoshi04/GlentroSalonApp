import { useState, useEffect } from 'react';
import { getAllReviews, deleteReview } from '../services/adminApi';
import PageHeader from '../../../components/common/PageHeader';
import Loader from '../../../components/common/Loader';
import Button from '../../../components/common/Button';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const res = await getAllReviews();
      setReviews(res.data.data);
    } catch (error) {
      console.error('Failed to load reviews', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review? This will immediately recalculate the salon rating.')) return;
    
    setDeletingId(id);
    try {
      await deleteReview(id);
      setReviews(reviews.filter(r => r._id !== id));
    } catch (error) {
      alert('Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loader fullScreen text="Loading reviews..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="All Platform Reviews" />

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No reviews found in the system.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Salon</th>
                  <th className="px-6 py-4 font-medium">Rating</th>
                  <th className="px-6 py-4 font-medium">Comment</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{review.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{review.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{review.salon?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                        <span className="text-gray-700 font-medium">{review.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={review.comment}>
                      {review.comment || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDelete(review._id)}
                        loading={deletingId === review._id}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
