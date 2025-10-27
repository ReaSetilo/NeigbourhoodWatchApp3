import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const Members = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        // Filter only neighborhood members
        const members = data.data.filter((user: any) => user.user_type === 'neighborhood_member');
        setUsers(members);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (args: any) => {
    setSelectedMember(args.data);
    setModalAction(null);
    setApprovalNotes('');
    setRejectionReason('');
    setShowModal(true);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${selectedMember.user_id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_notes: approvalNotes || 'Account approved by administrator'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✓ Member approved successfully!');
        setShowModal(false);
        setModalAction(null);
        setApprovalNotes('');
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error approving member:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/users/${selectedMember.user_id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✗ Member rejected successfully');
        setShowModal(false);
        setModalAction(null);
        setRejectionReason('');
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error rejecting member:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusTemplate = (props: any) => {
    const statusColors: Record<string, string> = {
      pending_approval: 'bg-yellow-50 text-yellow-700',
      active: 'bg-success-50 text-success-700',
      suspended: 'bg-red-50 text-red-500',
      inactive: 'bg-gray-200 text-gray-700',
      deleted: 'bg-red-100 text-red-500'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[props.status] || 'bg-gray-200 text-gray-700'}`}>
        {props.status}
      </span>
    );
  };

  const approvedTemplate = (props: any) => {
    return (
      <div className="flex-center">
        {props.is_approved ? (
          <span className="text-success-500 text-lg font-semibold">✓</span>
        ) : (
          <span className="text-red-500 text-lg font-semibold">✗</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Neighborhood Members"
          description="View and manage neighborhood member accounts"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading members...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Neighborhood Members"
          description="View and manage neighborhood member accounts"
        />
        <div className="error p-4">
          <p>Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className='members wrapper'>
      <Header
        title="Neighborhood Members"
        description="View and manage neighborhood member accounts"
      />
      
      <div className="container">
        <div className="flex-between mb-6">
          <h1 className="p-24-semibold text-dark-100">Neighborhood Members</h1>
          <p className="p-16-semibold text-gray-500">Total: {users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-300 p-6">
          <Grids.GridComponent 
            dataSource={users}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            pageSettings={{ pageSize: 10, pageSizes: [10, 25, 50, 100] }}
            filterSettings={{ type: 'Excel' }}
            width='100%'
            rowSelected={handleRowClick}
          >
            <Grids.ColumnsDirective>
              <Grids.ColumnDirective 
                field='user_id' 
                headerText='ID' 
                width='80'
                isPrimaryKey={true}
                textAlign='Center'
                visible={false}
              />
              <Grids.ColumnDirective 
                field='first_name' 
                headerText='First Name' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='last_name' 
                headerText='Last Name' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='email' 
                headerText='Email' 
                width='220'
              />
              <Grids.ColumnDirective 
                field='phone_number' 
                headerText='Phone' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='status' 
                headerText='Status' 
                width='130'
                template={statusTemplate}
              />
              <Grids.ColumnDirective 
                field='is_approved' 
                headerText='Approved' 
                width='110'
                template={approvedTemplate}
                textAlign='Center'
              />
              <Grids.ColumnDirective 
                field='last_login' 
                headerText='Last Login' 
                width='140'
                format='yMd'
                type='date'
              />
              <Grids.ColumnDirective 
                field='created_at' 
                headerText='Joined Date' 
                width='140'
                format='yMd'
                type='date'
              />
            </Grids.ColumnsDirective>
            <Grids.Inject services={[Grids.Page, Grids.Sort, Grids.Filter]} />
          </Grids.GridComponent>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Member Details - {selectedMember.first_name} {selectedMember.last_name}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">First Name</p>
                      <p className="text-base font-semibold">{selectedMember.first_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Name</p>
                      <p className="text-base font-semibold">{selectedMember.last_name}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-base font-semibold">{selectedMember.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-base font-semibold">{selectedMember.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Account Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        selectedMember.status === 'active' ? 'bg-success-50 text-success-700' :
                        selectedMember.status === 'pending_approval' ? 'bg-yellow-50 text-yellow-700' :
                        selectedMember.status === 'suspended' ? 'bg-red-50 text-red-500' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {selectedMember.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Approved</p>
                      <p className={`text-base font-semibold ${selectedMember.is_approved ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedMember.is_approved ? 'Yes ✓' : 'No ✗'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Dates */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Account Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Joined Date</p>
                      <p className="text-base font-semibold">
                        {selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="text-base font-semibold">
                        {selectedMember.last_login ? new Date(selectedMember.last_login).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                {!modalAction && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3">Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setModalAction('approve')}
                        disabled={selectedMember.is_approved && selectedMember.status === 'active'}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {selectedMember.is_approved ? '✓ Already Approved' : 'Approve Member'}
                      </button>
                      <button
                        onClick={() => setModalAction('reject')}
                        disabled={!selectedMember.is_approved && selectedMember.status === 'inactive'}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {!selectedMember.is_approved && selectedMember.status === 'inactive' ? '✗ Already Rejected' : 'Reject Member'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Approve Form */}
                {modalAction === 'approve' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Approve Member</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Approval Notes (Optional)
                        </label>
                        <textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="Enter any notes about this approval (e.g., 'Identity verified, documents checked')..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          These notes are for internal records only.
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-700 mb-2">
                          <strong>Approving this member will:</strong>
                        </p>
                        <ul className="list-disc list-inside text-sm text-green-600 space-y-1">
                          <li>Set account status to "active"</li>
                          <li>Grant full access to the system</li>
                          <li>Send approval notification to member</li>
                          <li>Allow member to login and use services</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApprove}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Approving...' : '✓ Confirm Approval'}
                        </button>
                        <button
                          onClick={() => {
                            setModalAction(null);
                            setApprovalNotes('');
                          }}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reject Form */}
                {modalAction === 'reject' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Reject Member</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason *
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Enter reason for rejection (e.g., 'Unable to verify identity', 'Incomplete documents')..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This reason will be sent to the member in their notification.
                        </p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 mb-2">
                          <strong>Rejecting this member will:</strong>
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                          <li>Set account status to "inactive"</li>
                          <li>Deny access to the system</li>
                          <li>Send rejection notification with reason</li>
                          <li>Prevent member from logging in</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={submitting || !rejectionReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Rejecting...' : '✗ Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => {
                            setModalAction(null);
                            setRejectionReason('');
                          }}
                          disabled={submitting}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Members;