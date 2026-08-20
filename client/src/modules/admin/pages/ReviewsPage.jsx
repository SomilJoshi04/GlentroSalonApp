import { useState, useEffect } from 'react';
import { getAllReviews, deleteReview } from '../services/adminApi';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  useEffect(() => {
    loadReviews(1);
  }, []);

  const loadReviews = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllReviews({ page, limit: pagination.limit });
      const data = res.data?.data;
      const list = data?.reviews || data || [];
      setReviews(Array.isArray(list) ? list : []);

      if (data && data.reviews) {
        setPagination({
          currentPage: data.page || page,
          totalPages: data.pages || 1,
          total: data.total || list.length,
          limit: pagination.limit
        });
      } else {
        setPagination({
          currentPage: 1,
          totalPages: 1,
          total: Array.isArray(list) ? list.length : 0,
          limit: pagination.limit
        });
      }
    } catch (error) {
      console.error('Failed to load reviews', error);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review? This will immediately recalculate the salon rating.')) return;
    
    setDeletingId(id);
    try {
      await deleteReview(id);
      const nextPage = (reviews.length === 1 && pagination.currentPage > 1)
        ? pagination.currentPage - 1
        : pagination.currentPage;
      loadReviews(nextPage);
    } catch (error) {
      alert('Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: 'User',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{row.user?.name || 'Unknown'}</span>
          <span className="text-[12px] text-muted-text">{row.user?.email}</span>
        </div>
      )
    },
    {
      header: 'Salon',
      render: (row) => <span className="font-medium">{row.salon?.name || 'Unknown'}</span>
    },
    {
      header: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1 text-rating">
          <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
          <span className="text-on-surface font-medium">{row.rating}</span>
        </div>
      )
    },
    {
      header: 'Comment',
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-muted-text" title={row.comment}>
          {row.comment || '-'}
        </span>
      )
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="text-muted-text">{new Date(row.createdAt).toLocaleDateString()}</span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button 
          onClick={() => handleDelete(row._id)}
          disabled={deletingId === row._id}
          className="p-2 text-error hover:bg-error/10 transition-colors rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          {deletingId === row._id ? '...' : (
            <>
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span className="text-sm font-medium">Delete</span>
            </>
          )}
        </button>
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="All Platform Reviews"
        description="Monitor and manage all user reviews."
      />
      
      <DataTable 
        columns={columns}
        data={reviews}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={loadReviews}
      />
    </AdminPageLayout>
  );
};

export default ReviewsPage;
