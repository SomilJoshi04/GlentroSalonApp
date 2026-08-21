import { useState } from 'react';
import Button from '../../../components/common/Button';

const RecoveryRequestModal = ({ isOpen, onClose, request, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    setAction('approve');
    setLoading(true);
    await onApprove(request._id);
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setAction('reject');
    setLoading(true);
    await onReject(request._id, rejectReason);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-scale-in">
        <div className="flex justify-between items-center p-6 border-b border-border bg-background-alt">
          <h2 className="text-xl font-headline-sm font-bold text-on-surface">Review Recovery Request</h2>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-muted-text">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          <div className="bg-primary/5 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-primary mb-2">User Details</h3>
            <p className="text-sm"><span className="font-medium text-muted-text">Name:</span> {request.userId?.name}</p>
            <p className="text-sm"><span className="font-medium text-muted-text">Email:</span> {request.userId?.email}</p>
            <p className="text-sm"><span className="font-medium text-muted-text">Phone:</span> {request.userId?.phone || 'N/A'}</p>
          </div>

          <div className="bg-surface-variant rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-on-surface mb-2">Recovery Request Details</h3>
            <p className="text-sm"><span className="font-medium text-muted-text">Requested On:</span> {new Date(request.requestedAt).toLocaleString()}</p>
            <p className="text-sm mt-2"><span className="font-medium text-muted-text">User's Reason:</span></p>
            <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg border border-border mt-1 whitespace-pre-wrap">
              {request.reason}
            </p>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-on-surface mb-2">Rejection Note (Required if Rejecting)</label>
            <textarea
              className="w-full p-3 rounded-xl border border-border bg-surface focus:border-error focus:ring-1 focus:ring-error outline-none transition-all resize-none h-24 text-sm"
              placeholder="Why is this request being rejected?"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="p-6 border-t border-border bg-background-alt flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleReject}
            loading={loading && action === 'reject'}
            disabled={(loading && action !== 'reject') || !rejectReason.trim()}
          >
            Reject Request
          </Button>
          <Button 
            onClick={handleApprove}
            loading={loading && action === 'approve'}
            disabled={loading && action !== 'approve'}
          >
            Approve Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryRequestModal;
