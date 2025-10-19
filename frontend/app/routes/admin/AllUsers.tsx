import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          setUsers(data.data);
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

    fetchUsers();
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

  const userTypeTemplate = (props: any) => {
    const typeColors: Record<string, string> = {
      admin: 'bg-pink-50 text-pink-500',
      security_officer: 'bg-primary-50 text-primary-500',
      neighborhood_member: 'bg-navy-50 text-navy-500'
    };

    const displayName = props.user_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[props.user_type] || 'bg-gray-200 text-gray-700'}`}>
        {displayName}
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
          title="Users Management"
          description="View and manage all users in the system"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading users...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Users Management"
          description="View and manage all users in the system"
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
        title="Users Management"
        description="View and manage all users in the system"
      />
      
      <div className="container">
        <div className="flex-between mb-6">
          <h1 className="p-24-semibold text-dark-100">All Users</h1>
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
          >
            <Grids.ColumnsDirective>
              <Grids.ColumnDirective 
                field='user_id' 
                headerText='ID' 
                width='80'
                isPrimaryKey={true}
                textAlign='Center'
                visible={true}
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
                field='user_type' 
                headerText='User Type' 
                width='160'
                template={userTypeTemplate}
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
    </main>
  );
};

export default AllUsers;