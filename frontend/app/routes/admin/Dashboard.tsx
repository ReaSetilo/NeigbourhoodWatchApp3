import StatsCard from 'components/StatsCard';
import Header from 'components/Header';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = { name: "Reatile" };
    
    const [dashboardStats, setDashboardStats] = useState({
        monitoredHouses: {
            total: 0,
            suspended: 0
        },
        UserOverview: {
            Admins: 0,
            Members: 0,
            officers: 0,
            total: 0
        },
        patrolSummary: {
            todayScans: 0,
            alerts: 0,
            missed: 0,
            totalScans: 0,
            uniqueOfficers: 0,
            uniqueLocations: 0
        }
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch houses data
                const housesResponse = await fetch('http://localhost:3000/api/admin/houses', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const housesData = await housesResponse.json();

                // Fetch users data
                const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const usersData = await usersResponse.json();

                // Fetch patrol statistics for today
                const patrolTodayResponse = await fetch('http://localhost:3000/api/admin/patrolStats?period=day', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const patrolTodayData = await patrolTodayResponse.json();

                // Fetch patrol statistics for the month (for overall context)
                const patrolMonthResponse = await fetch('http://localhost:3000/api/admin/patrolStats?period=month', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const patrolMonthData = await patrolMonthResponse.json();

                if (housesData.success && usersData.success) {
                    const houses = housesData.data;
                    const users = usersData.data;

                    // Calculate houses stats
                    const totalHouses = houses.length;
                    const suspendedHouses = houses.filter((h: any) => h.status === 'suspended').length;

                    // Calculate user stats
                    const admins = users.filter((u: any) => u.user_type === 'admin').length;
                    const members = users.filter((u: any) => u.user_type === 'neighborhood_member').length;
                    const officers = users.filter((u: any) => u.user_type === 'security_officer').length;

                    

                    // Extract patrol statistics
                    const todayStats = patrolTodayData.success ? patrolTodayData.data.summary : null;
                    const todayAnomalies = patrolTodayData.success ? patrolTodayData.data.anomaly_statistics : null;
                    const monthStats = patrolMonthData.success ? patrolMonthData.data.summary : null;

                    setDashboardStats({
                        monitoredHouses: {
                            total: totalHouses,
                            suspended: suspendedHouses
                        },
                        UserOverview: {
                            Admins: admins,
                            Members: members,
                            officers: officers,
                            total: users.length
                        },
                        patrolSummary: {
                            todayScans: todayStats?.total_scans || 0,
                            alerts: todayAnomalies?.total || 0,
                            missed: todayAnomalies?.by_type?.missed_patrol || 0,
                            totalScans: monthStats?.total_scans || 0,
                            uniqueOfficers: todayStats?.unique_officers || 0,
                            uniqueLocations: todayStats?.unique_locations || 0
                        },
                    });
                } else {
                    throw new Error('Failed to fetch dashboard data');
                }
            } catch (err: any) {
                setError(err.message);
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <main className='dashboard wrapper'>
                <Header
                    title={`Welcome👋`}
                    description="Track activity and manage the system"
                />
                <div className="flex-center p-8">
                    <p className="p-18-regular text-gray-500">Loading dashboard...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className='dashboard wrapper'>
                <Header
                    title={`Welcome ${user.name} 👋`}
                    description="Track activity and manage the system"
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
                title={`Welcome ${user.name} 👋`}
                description="Track activity and manage the system"
            />

            <section className='flex flex-col gap-6'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full'>
                    <div onClick={() => navigate('/houses')} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <StatsCard
                            headerTitle="Monitored Houses"
                            total={dashboardStats.monitoredHouses.total}
                            suspended={dashboardStats.monitoredHouses.suspended}
                        />
                    </div>
                    
                    <div onClick={() => navigate('/all-users')} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <StatsCard
                            headerTitle="User overview"
                            admins={dashboardStats.UserOverview.Admins}
                            members={dashboardStats.UserOverview.Members}
                            officers={dashboardStats.UserOverview.officers}
                        />
                    </div>
                    
                    
                    
                    <div onClick={() => navigate('/patrol-stats')} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <StatsCard
                            headerTitle="Patrol Summary (Today)"
                            todayScans={dashboardStats.patrolSummary.todayScans}
                            alerts={dashboardStats.patrolSummary.alerts}
                            missed={dashboardStats.patrolSummary.missed}
                            uniqueOfficers={dashboardStats.patrolSummary.uniqueOfficers}
                            uniqueLocations={dashboardStats.patrolSummary.uniqueLocations}
                        />
                    </div>
                    
                    
                </div>
            </section>
        </main>
    );
}

export default Dashboard;