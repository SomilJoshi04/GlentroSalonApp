import { useState, useEffect } from 'react';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import { getAdminBookingIssues, updateBookingIssueStatus } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../../../components/common/Modal';

const AdminBookingIssuesPage = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await getAdminBookingIssues();
      setIssues(res.data.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateBookingIssueStatus(id, newStatus);
      loadIssues();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    }
    setUpdatingStatus(false);
  };

  const columns = [
    {
      header: 'Issue ID',
      accessor: (issue) => <span className="font-medium text-on-surface">#{issue._id.slice(-6).toUpperCase()}</span>,
    },
    {
      header: 'User',
      accessor: (issue) => (
        <div>
          <p className="font-medium text-on-surface">{issue.user?.name || 'Unknown'}</p>
          <p className="text-xs text-muted-text">{issue.user?.email}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (issue) => <span className="capitalize">{issue.issueType.replace('_', ' ')}</span>,
    },
    {
      header: 'Booking ID',
      accessor: (issue) => <span className="text-muted-text">#{issue.booking?._id?.slice(-6).toUpperCase()}</span>,
    },
    {
      header: 'Status',
      accessor: (issue) => {
        let status = 'pending';
        let type = 'warning';
        if (issue.status === 'resolved') { status = 'Resolved'; type = 'success'; }
        else if (issue.status === 'in_progress') { status = 'In Progress'; type = 'info'; }
        else if (issue.status === 'closed') { status = 'Closed'; type = 'error'; }
        return <StatusBadge status={status} type={type} />;
      },
    },
    {
      header: 'Date',
      accessor: (issue) => new Date(issue.createdAt).toLocaleDateString(),
    }
  ];

  const handleRowClick = (issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Booking Issues"
        description="Review and resolve issues reported by users regarding their bookings."
      />

      <div className="bg-surface rounded-2xl shadow-sm border border-border mt-6">
        <DataTable 
          columns={columns}
          data={issues}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No booking issues found."
        />
      </div>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Booking Issue Details"
      >
        {selectedIssue && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-text font-medium uppercase tracking-wider">Issue Type</p>
                <p className="font-medium text-on-surface capitalize mt-1">{selectedIssue.issueType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-text font-medium uppercase tracking-wider">Reported By</p>
                <p className="font-medium text-on-surface mt-1">{selectedIssue.user?.name}</p>
                <p className="text-xs text-muted-text">{selectedIssue.user?.phone}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-text font-medium uppercase tracking-wider">Booking Reference</p>
              <div className="mt-2 p-3 bg-background-alt border border-border rounded-xl">
                <p className="text-sm font-medium">#{selectedIssue.booking?._id?.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-muted-text mt-1">Date: {new Date(selectedIssue.booking?.bookingDate).toLocaleDateString()} at {selectedIssue.booking?.timeSlot}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-text font-medium uppercase tracking-wider">Description</p>
              <p className="mt-2 text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{selectedIssue.description}</p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-text font-medium uppercase tracking-wider mb-3">Update Status</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleStatusChange(selectedIssue._id, 'pending')}
                  disabled={updatingStatus || selectedIssue.status === 'pending'}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${selectedIssue.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}
                >Pending</button>
                <button 
                  onClick={() => handleStatusChange(selectedIssue._id, 'in_progress')}
                  disabled={updatingStatus || selectedIssue.status === 'in_progress'}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${selectedIssue.status === 'in_progress' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}
                >In Progress</button>
                <button 
                  onClick={() => handleStatusChange(selectedIssue._id, 'resolved')}
                  disabled={updatingStatus || selectedIssue.status === 'resolved'}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${selectedIssue.status === 'resolved' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}
                >Resolved</button>
                <button 
                  onClick={() => handleStatusChange(selectedIssue._id, 'closed')}
                  disabled={updatingStatus || selectedIssue.status === 'closed'}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${selectedIssue.status === 'closed' ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}
                >Closed</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminPageLayout>
  );
};

export default AdminBookingIssuesPage;
