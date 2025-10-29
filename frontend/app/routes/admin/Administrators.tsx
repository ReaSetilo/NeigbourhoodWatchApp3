import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

const Administrators = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    can_modify_system_config: false
  });

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
        // Filter only administrators
        const administrators = data.data.filter((user: any) => user.user_type === 'admin');
        setUsers(administrators);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:3000/api/admin/administrators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number,
          password: formData.password,
          can_modify_system_config: formData.can_modify_system_config
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create admin');
      }

      if (data.success) {
        setFormSuccess('Administrator created successfully!');
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          password: '',
          confirmPassword: '',
          can_modify_system_config: false
        });
        // Refresh the users list
        fetchUsers();
        // Close modal after 2 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to create admin');
      }
    } catch (err: any) {
      setFormError(err.message);
      console.error('Error creating admin:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      password: '',
      confirmPassword: '',
      can_modify_system_config: false
    });
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
          title="Administrators"
          description="View and manage administrator accounts"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading administrators...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Administrators"
          description="View and manage administrator accounts"
        />
        <div className="error p-4">
          <p>Error: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className='administrators wrapper'>
      <Header
        title="Administrators"
        description="View and manage administrator accounts"
      />
      
      <div className="container">
        <div className="flex-between mb-6">
          <h1 className="p-24-semibold text-dark-100">Administrators</h1>
          <div className="flex items-center gap-4">
            <p className="p-16-semibold text-gray-500">Total: {users.length}</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span> Add
            </button>
          </div>
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

      {/* Add Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Add New Administrator</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="can_modify_system_config"
                  id="can_modify_system_config"
                  checked={formData.can_modify_system_config}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="can_modify_system_config" className="ml-2 text-sm text-gray-700">
                  Can modify system configuration
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Administrators;