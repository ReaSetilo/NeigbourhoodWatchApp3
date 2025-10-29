import React, { useState, useEffect } from 'react';
import Header from 'components/Header';
import * as Grids from '@syncfusion/ej2-react-grids';

interface PatrolStats {
  summary: {
    total_scans: number;
    unique_officers: number;
    unique_locations: number;
    first_patrol: string | null;
    last_patrol: string | null;
    period: string;
    date_range: {
      start: string;
      end: string;
    } | null;
    averages: {
      scans_per_day: number;
      locations_per_day: number;
    };
  };
  officer_statistics: Array<{
    officer_id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    total_scans: number;
    unique_locations: number;
    last_patrol: string | null;
    first_patrol: string | null;
  }>;
  location_statistics: Array<{
    qr_code_id: string;
    gate_name: string;
    location_description: string;
    total_scans: number;
    unique_officers: number;
    last_patrol: string | null;
    first_patrol: string | null;
  }>;
  daily_statistics: Array<{
    date: string;
    total_scans: number;
    unique_officers: number;
    unique_locations: number;
  }>;
  hourly_distribution: Record<string, number>;
  anomaly_statistics: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  };
  recent_anomalies: Array<any>;
}

const PatrolStats = () => {
  const [stats, setStats] = useState<PatrolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'officers' | 'locations' | 'daily' | 'anomalies'>('overview');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('');

  useEffect(() => {
    fetchPatrolStats();
  }, [period, selectedOfficer]);

  const fetchPatrolStats = async () => {
    try {
      setLoading(true);
      let url = `http://localhost:3000/api/admin/patrolStats?period=${period}`;
      
      if (selectedOfficer) {
        url += `&officer_id=${selectedOfficer}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patrol statistics');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch patrol statistics');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching patrol statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Patrol Statistics"
          description="Monitor patrol activity and performance"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">Loading patrol statistics...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Patrol Statistics"
          description="Monitor patrol activity and performance"
        />
        <div className="error p-4">
          <p>Error: {error}</p>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className='dashboard wrapper'>
        <Header
          title="Patrol Statistics"
          description="Monitor patrol activity and performance"
        />
        <div className="flex-center p-8">
          <p className="p-18-regular text-gray-500">No patrol data available</p>
        </div>
      </main>
    );
  }

  return (
    <main className='patrol-stats wrapper'>
      <Header
        title="Patrol Statistics"
        description="Monitor patrol activity and performance"
      />
      
      <div className="container">
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-300 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View
              </label>
              <select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="overview">Overview</option>
                <option value="officers">By Officer</option>
                <option value="locations">By Location</option>
                <option value="daily">Daily Breakdown</option>
                <option value="anomalies">Anomalies</option>
              </select>
            </div>

            <div className="ml-auto">
              <button
                onClick={fetchPatrolStats}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        {selectedView === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Scans</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.summary.total_scans}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Avg: {stats.summary.averages.scans_per_day.toFixed(1)}/day
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Active Officers</h3>
                <p className="text-3xl font-bold text-green-600">{stats.summary.unique_officers}</p>
                <p className="text-xs text-gray-500 mt-2">On patrol duty</p>
              </div>

              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Locations Covered</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.summary.unique_locations}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Avg: {stats.summary.averages.locations_per_day.toFixed(1)}/day
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Anomalies</h3>
                <p className="text-3xl font-bold text-red-600">{stats.anomaly_statistics.total}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.anomaly_statistics.by_status.pending || 0} pending
                </p>
              </div>
            </div>

            {/* Period Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Viewing: <span className="font-bold capitalize">{stats.summary.period}</span>
                  </p>
                  {stats.summary.date_range && (
                    <p className="text-xs text-blue-700 mt-1">
                      {formatDateOnly(stats.summary.date_range.start)} - {formatDateOnly(stats.summary.date_range.end)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700">First Patrol</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {formatDate(stats.summary.first_patrol)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700">Last Patrol</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {formatDate(stats.summary.last_patrol)}
                  </p>
                </div>
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="bg-white rounded-xl shadow-300 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Hourly Distribution</h3>
              <div className="grid grid-cols-12 gap-2">
                {Object.entries(stats.hourly_distribution)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([hour, count]) => (
                    <div key={hour} className="flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ 
                          height: `${Math.max((count / Math.max(...Object.values(stats.hourly_distribution))) * 100, 5)}px` 
                        }}
                        title={`${count} scans`}
                      />
                      <span className="text-xs text-gray-600 mt-1">{hour}</span>
                      <span className="text-xs font-semibold text-gray-800">{count}</span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Patrol scans by hour of day</p>
            </div>

            {/* Anomaly Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-lg font-semibold mb-4">Anomalies by Type</h3>
                <div className="space-y-3">
                  {Object.entries(stats.anomaly_statistics.by_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-300 p-6">
                <h3 className="text-lg font-semibold mb-4">Anomalies by Status</h3>
                <div className="space-y-3">
                  {Object.entries(stats.anomaly_statistics.by_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 capitalize">{status}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        status === 'resolved' ? 'bg-green-100 text-green-700' :
                        status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Officer Statistics View */}
        {selectedView === 'officers' && (
          <div className="bg-white rounded-xl shadow-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Officer Performance</h2>
            <Grids.GridComponent 
              dataSource={stats.officer_statistics}
              allowPaging={true}
              allowSorting={true}
              allowFiltering={true}
              pageSettings={{ pageSize: 10, pageSizes: [10, 25, 50] }}
              filterSettings={{ type: 'Excel' }}
              width='100%'
            >
              <Grids.ColumnsDirective>
                <Grids.ColumnDirective 
                  field='employee_id' 
                  headerText='Employee ID' 
                  width='130'
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
                  field='total_scans' 
                  headerText='Total Scans' 
                  width='130'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='unique_locations' 
                  headerText='Locations' 
                  width='120'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='last_patrol' 
                  headerText='Last Patrol' 
                  width='180'
                  format='yMd h:mm a'
                  type='datetime'
                />
                <Grids.ColumnDirective 
                  field='first_patrol' 
                  headerText='First Patrol' 
                  width='180'
                  format='yMd h:mm a'
                  type='datetime'
                />
              </Grids.ColumnsDirective>
              <Grids.Inject services={[Grids.Page, Grids.Sort, Grids.Filter]} />
            </Grids.GridComponent>
          </div>
        )}

        {/* Location Statistics View */}
        {selectedView === 'locations' && (
          <div className="bg-white rounded-xl shadow-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Location Coverage</h2>
            <Grids.GridComponent 
              dataSource={stats.location_statistics}
              allowPaging={true}
              allowSorting={true}
              allowFiltering={true}
              pageSettings={{ pageSize: 10, pageSizes: [10, 25, 50] }}
              filterSettings={{ type: 'Excel' }}
              width='100%'
            >
              <Grids.ColumnsDirective>
                <Grids.ColumnDirective 
                  field='gate_name' 
                  headerText='Gate/Location' 
                  width='150'
                />
                <Grids.ColumnDirective 
                  field='location_description' 
                  headerText='Description' 
                  width='250'
                />
                <Grids.ColumnDirective 
                  field='total_scans' 
                  headerText='Total Scans' 
                  width='130'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='unique_officers' 
                  headerText='Officers' 
                  width='110'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='last_patrol' 
                  headerText='Last Patrol' 
                  width='180'
                  format='yMd h:mm a'
                  type='datetime'
                />
              </Grids.ColumnsDirective>
              <Grids.Inject services={[Grids.Page, Grids.Sort, Grids.Filter]} />
            </Grids.GridComponent>
          </div>
        )}

        {/* Daily Statistics View */}
        {selectedView === 'daily' && (
          <div className="bg-white rounded-xl shadow-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Daily Breakdown</h2>
            <Grids.GridComponent 
              dataSource={stats.daily_statistics}
              allowPaging={true}
              allowSorting={true}
              pageSettings={{ pageSize: 15, pageSizes: [15, 30, 50] }}
              width='100%'
            >
              <Grids.ColumnsDirective>
                <Grids.ColumnDirective 
                  field='date' 
                  headerText='Date' 
                  width='150'
                  format='yMd'
                  type='date'
                />
                <Grids.ColumnDirective 
                  field='total_scans' 
                  headerText='Total Scans' 
                  width='150'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='unique_officers' 
                  headerText='Officers on Duty' 
                  width='180'
                  textAlign='Center'
                />
                <Grids.ColumnDirective 
                  field='unique_locations' 
                  headerText='Locations Covered' 
                  width='180'
                  textAlign='Center'
                />
              </Grids.ColumnsDirective>
              <Grids.Inject services={[Grids.Page, Grids.Sort]} />
            </Grids.GridComponent>
          </div>
        )}

        {/* Anomalies View */}
        {selectedView === 'anomalies' && (
          <div className="bg-white rounded-xl shadow-300 p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Anomalies</h2>
            {stats.recent_anomalies.length > 0 ? (
              <Grids.GridComponent 
                dataSource={stats.recent_anomalies}
                allowPaging={true}
                allowSorting={true}
                allowFiltering={true}
                pageSettings={{ pageSize: 10 }}
                filterSettings={{ type: 'Excel' }}
                width='100%'
              >
                <Grids.ColumnsDirective>
                  <Grids.ColumnDirective 
                    field='anomaly_type' 
                    headerText='Type' 
                    width='150'
                  />
                  <Grids.ColumnDirective 
                    field='detection_date' 
                    headerText='Detected' 
                    width='180'
                    format='yMd h:mm a'
                    type='datetime'
                  />
                  <Grids.ColumnDirective 
                    field='status' 
                    headerText='Status' 
                    width='120'
                  />
                  <Grids.ColumnDirective 
                    field='notes' 
                    headerText='Notes' 
                    width='300'
                  />
                </Grids.ColumnsDirective>
                <Grids.Inject services={[Grids.Page, Grids.Sort, Grids.Filter]} />
              </Grids.GridComponent>
            ) : (
              <p className="text-gray-500 text-center py-8">No anomalies detected in this period</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default PatrolStats;