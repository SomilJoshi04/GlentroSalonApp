import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import PageHeader from '../../../../components/common/PageHeader';
import { getMyBookings, getMyBookingIssues, createBookingIssue } from '../../services/userApi';
import StatusBadge from '../../../admin/components/StatusBadge';

const ISSUE_TYPES = [
  { value: 'unconfirmed', label: 'Booking Not Confirmed' },
  { value: 'payment', label: 'Payment Issue (Deducted but not confirmed)' },
  { value: 'refund', label: 'Refund Related' },
  { value: 'reschedule', label: 'Rescheduling Issue' },
  { value: 'vendor_rejected', label: 'Salon Rejected Booking' },
  { value: 'wrong_details', label: 'Wrong Booking Details' },
  { value: 'other', label: 'Other Issue' },
];

const BookingIssuesPage = () => {
  const [issues, setIssues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const fromProfile = location.state?.fromProfile;
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, bookingsRes] = await Promise.all([
        getMyBookingIssues(),
        getMyBookings({ status: 'all', limit: 20 }) // fetch recent 20 bookings
      ]);

      if (issuesRes.data?.success) setIssues(issuesRes.data.data);

      if (bookingsRes.data?.success) {
        // Handle pagination structure from getMyBookings
        const bookingsData = bookingsRes.data.data.bookings || bookingsRes.data.data;
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBooking || !issueType || !description.trim()) {
      setMessage({ type: 'error', text: 'Please fill out all fields.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await createBookingIssue({
        bookingId: selectedBooking,
        issueType,
        description
      });

      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Your issue has been reported successfully.' });
        setShowForm(false);
        setSelectedBooking('');
        setIssueType('');
        setDescription('');
        loadData(); // reload issues list
      }
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to report issue. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = (status) => {
    let text = 'Pending';
    let type = 'warning';

    if (status === 'in_progress') { text = 'In Progress'; type = 'info'; }
    if (status === 'resolved') { text = 'Resolved'; type = 'success'; }
    if (status === 'closed') { text = 'Closed'; type = 'error'; }

    return <StatusBadge status={text} type={type} />;
  };

  return (
    <div className="w-full min-h-screen bg-surface-bright pb-16">
      <div className="md:hidden">
        <PageHeader title="Booking Issues" fallbackPath="/profile" />
      </div>

      <div className="relative overflow-hidden bg-surface-container-lowest border-b border-border mb-8 py-8 md:py-16">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {fromProfile && (
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <h1 className="font-headline-lg md:font-headline-xl text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
                Booking Issues
              </h1>
            </div>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Report Issue
              </button>
            )}
          </div>
          <p className="text-muted-text text-lg">Report and track problems related to your specific bookings.</p>

          {!showForm && user && (
            <button
              onClick={() => setShowForm(true)}
              className="md:hidden mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-medium shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Report New Issue
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6">

        {!user ? (
          <div className="bg-surface rounded-3xl border border-border p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <span className="material-symbols-outlined text-[32px]">lock</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Login Required</h3>
            <p className="text-muted-text max-w-md mx-auto mb-6">You must be logged in to view and report booking issues.</p>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Log In to Continue
            </Link>
          </div>
        ) : (
          <>
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <span className="material-symbols-outlined mt-0.5">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                <p>{message.text}</p>
              </div>
            )}

        {showForm ? (
          <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Report New Issue</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-muted-text hover:bg-surface-variant rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Select Booking</label>
                <select
                  value={selectedBooking}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                >
                  <option value="">-- Choose a recent booking --</option>
                  {bookings.map(b => (
                    <option key={b._id} value={b._id}>
                      {new Date(b.bookingDate).toLocaleDateString()} - {b.salon?.name || 'Unknown Salon'} ({b.status})
                    </option>
                  ))}
                </select>
                {bookings.length === 0 && !loading && (
                  <p className="text-xs text-red-500 mt-1">You have no recent bookings to report issues for.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Issue Type</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                >
                  <option value="">-- Select issue type --</option>
                  {ISSUE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide details about your issue..."
                  rows="4"
                  className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 text-on-surface-variant font-medium hover:bg-surface-variant rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedBooking || !issueType}
                  className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-4 px-1">Your Reported Issues</h2>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-32 bg-surface-variant rounded-2xl animate-pulse"></div>)}
              </div>
            ) : issues.length === 0 ? (
              <div className="bg-surface rounded-3xl border border-border p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4 text-muted-text">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h3 className="text-lg font-semibold text-on-surface">No Issues Found</h3>
                <p className="text-muted-text mt-2 max-w-sm mx-auto">You haven't reported any booking issues. Everything looks good!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {issues.map(issue => (
                  <div key={issue._id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-on-surface capitalize text-lg">
                            {issue.issueType.replace('_', ' ')}
                          </h3>
                          {renderStatus(issue.status)}
                        </div>
                        <p className="text-sm font-medium text-on-surface-variant">
                          Booking ID: #{issue.booking?._id?.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-text mt-1">
                          {issue.booking?.salon?.name || 'Salon'} • {new Date(issue.booking?.bookingDate).toLocaleDateString()}
                        </p>

                        <div className="mt-4 p-4 bg-background-alt rounded-xl text-sm text-on-surface-variant leading-relaxed">
                          {issue.description}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-muted-text shrink-0 sm:text-right">
                        Reported on<br className="hidden sm:block" /> {new Date(issue.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingIssuesPage;
