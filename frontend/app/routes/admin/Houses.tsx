import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const Houses = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'suspend' | 'reactivate' | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/admin/houses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch houses');
      }

      const data = await response.json();
      
      if (data.success) {
        setHouses(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch houses');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching houses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (args: any) => {
    setSelectedHouse(args.data);
    setModalAction(null);
    setSuspensionReason('');
    setShowModal(true);
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      alert('Please provide a suspension reason');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/houses/${selectedHouse.house_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: suspensionReason
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('House suspended successfully');
        setShowModal(false);
        fetchHouses(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error suspending house:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/houses/${selectedHouse.house_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reactivate'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('House reactivated successfully');
        setShowModal(false);
        fetchHouses(); // Refresh the list
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Error reactivating house:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusTemplate = (props: any) => {
    const statusColors: Record<string, string> = {
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

  const subscriptionStatusTemplate = (props: any) => {
    const statusColors: Record<string, string> = {
      active: 'bg-success-50 text-success-700',
      suspended: 'bg-red-50 text-red-500',
      inactive: 'bg-gray-200 text-gray-700',
      cancelled: 'bg-red-100 text-red-500'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[props.subscription_status] || 'bg-gray-200 text-gray-700'}`}>
        {props.subscription_status || 'N/A'}
      </span>
    );
  };

  const qrActiveTemplate = (props: any) => {
    return (
      <div className="flex-center">
        {props.qr_active ? (
          <span className="text-success-500 text-lg font-semibold">✓</span>
        ) : (
          <span className="text-red-500 text-lg font-semibold">✗</span>
        )}
      </div>
    );
  };

  const missedPaymentsTemplate = (props: any) => {
    const count = props.missed_payments_count || 0;
    const colorClass = count > 2 ? 'text-red-500' : count > 0 ? 'text-red-100' : 'text-gray-500';
    
    return (
      <span className={`font-semibold ${colorClass}`}>
        {count}
      </span>
    );
  };

  if (loading) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Houses Management"
          description="View and manage all houses in the neighborhood"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading houses...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Houses Management"
          description="View and manage all houses in the neighborhood"
        />
        <div className="error p-4">
          <p>Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className='dashboard wrapper'>
      <Header
        title="Houses Management"
        description="View and manage all houses in the neighborhood"
      />
      
      <div className="container">
        <div className="flex-between mb-6">
          <h1 className="p-24-semibold text-dark-100">All Houses</h1>
          <p className="p-16-semibold text-gray-500">Total: {houses.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-300 p-6">
          <Grids.GridComponent 
            dataSource={houses}
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
                field='house_id' 
                headerText='ID' 
                width='80'
                isPrimaryKey={true}
                textAlign='Center'
                visible={true}
              />
              <Grids.ColumnDirective 
                field='house_number' 
                headerText='House Number' 
                width='130'
              />
              <Grids.ColumnDirective 
                field='street_address' 
                headerText='Street Address' 
                width='200'
              />
              <Grids.ColumnDirective 
                field='status' 
                headerText='Status' 
                width='130'
                template={statusTemplate}
              />
              <Grids.ColumnDirective 
                field='gate_name' 
                headerText='Gate Name' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='qr_active' 
                headerText='QR Active' 
                width='110'
                template={qrActiveTemplate}
                textAlign='Center'
              />
              <Grids.ColumnDirective 
                field='member_first_name' 
                headerText='Member First Name' 
                width='150'
              />
              <Grids.ColumnDirective 
                field='member_last_name' 
                headerText='Member Last Name' 
                width='150'
              />
              <Grids.ColumnDirective 
                field='member_email' 
                headerText='Member Email' 
                width='200'
              />
              <Grids.ColumnDirective 
                field='member_phone' 
                headerText='Member Phone' 
                width='140'
              />
              <Grids.ColumnDirective 
                field='subscription_status' 
                headerText='Subscription' 
                width='140'
                template={subscriptionStatusTemplate}
              />
              <Grids.ColumnDirective 
                field='missed_payments_count' 
                headerText='Missed Payments' 
                width='140'
                template={missedPaymentsTemplate}
                textAlign='Center'
              />
              <Grids.ColumnDirective 
                field='created_at' 
                headerText='Date Added' 
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
      {showModal && selectedHouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  House Details - {selectedHouse.house_number}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">House Number</p>
                    <p className="text-base font-semibold">{selectedHouse.house_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedHouse.status === 'active' ? 'bg-success-50 text-success-700' :
                      selectedHouse.status === 'suspended' ? 'bg-red-50 text-red-500' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {selectedHouse.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Street Address</p>
                  <p className="text-base font-semibold">{selectedHouse.street_address || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Gate Name</p>
                    <p className="text-base font-semibold">{selectedHouse.gate_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">QR Active</p>
                    <p className="text-base font-semibold">{selectedHouse.qr_active ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Member Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-base font-semibold">
                        {selectedHouse.member_first_name} {selectedHouse.member_last_name}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-base font-semibold">{selectedHouse.member_email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-base font-semibold">{selectedHouse.member_phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Subscription Status</p>
                        <p className="text-base font-semibold">{selectedHouse.subscription_status || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Missed Payments</p>
                        <p className={`text-base font-semibold ${
                          selectedHouse.missed_payments_count > 2 ? 'text-red-500' :
                          selectedHouse.missed_payments_count > 0 ? 'text-orange-500' :
                          'text-green-500'
                        }`}>
                          {selectedHouse.missed_payments_count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                {!modalAction && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3">Actions</h3>
                    <div className="space-y-2">
                      {selectedHouse.status !== 'suspended' ? (
                        <button
                          onClick={() => setModalAction('suspend')}
                          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        >
                          Suspend House
                        </button>
                      ) : (
                        <button
                          onClick={() => setModalAction('reactivate')}
                          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                          Reactivate House
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Suspend Form */}
                {modalAction === 'suspend' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Suspend House</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Suspension Reason *
                        </label>
                        <textarea
                          value={suspensionReason}
                          onChange={(e) => setSuspensionReason(e.target.value)}
                          placeholder="Enter reason for suspension..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSuspend}
                          disabled={submitting || !suspensionReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Suspending...' : 'Confirm Suspension'}
                        </button>
                        <button
                          onClick={() => {
                            setModalAction(null);
                            setSuspensionReason('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reactivate Confirmation */}
                {modalAction === 'reactivate' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Reactivate House</h3>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to reactivate this house? This will restore full access for the member.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReactivate}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Reactivating...' : 'Confirm Reactivation'}
                      </button>
                      <button
                        onClick={() => setModalAction(null)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
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

export default Houses;