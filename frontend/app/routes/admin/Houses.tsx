import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const Houses = () => {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchHouses();
  }, []);

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
    </main>
  );
};

export default Houses;