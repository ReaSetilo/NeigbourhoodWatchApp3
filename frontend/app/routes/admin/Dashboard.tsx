import StatsCard  from 'components/StatsCard';
import Header from 'components/Header';
import React from 'react';

const Dashboard = () => {
    const user={name:"Reatile"};
    const dashboardStats = {
        monitoredHouses:{
            total: 85,
            suspended:3
        }, 
        UserOverview:{
            Admins:4,
            Members:420,
            officers: 10
        },
        SecurityLog:{
            OTPsent:132,
            twoFAfailures:3
        },
        patrolSummary:{
            Today: "122 scans",
            Alerts: "4 flagged",
            Missed: "2"
        },
        Subscriptions:{
            Active:67,
            Revenue: 10500
        },
        SystemConfig:{
            Version:"v1.2.3",
            LastChange: "2.d.ago"
        }
    };
  return (
    <main className='dashboard wrapper'>
        <Header
        title={`Welcome ${user.name} 👋`}
        description="Track activity and manage the system"/>

        <section className='flex flex-col gap-6'>
            <div className='grid grid-cols 1 md:grid-cols-3 gap-6 w-full'>
                <StatsCard
                headerTitle="Monitored Houses"
                total={dashboardStats.monitoredHouses.total}
                suspended={dashboardStats.monitoredHouses.suspended}/>
                <StatsCard
                headerTitle="User overview"
                admins={dashboardStats.UserOverview.Admins}
                members={dashboardStats.UserOverview.Members}
                officers={dashboardStats.UserOverview.officers}/>
                <StatsCard
                headerTitle="Security log"
                Otp={dashboardStats.SecurityLog.OTPsent}
                twoFA={dashboardStats.SecurityLog.twoFAfailures}/>
                <StatsCard
                headerTitle="Patrol Summary"
                today={dashboardStats.patrolSummary.Today}
                alerts={dashboardStats.patrolSummary.Alerts}
                missedZones={dashboardStats.patrolSummary.Missed}/>
                <StatsCard
                headerTitle="Subscription stats"
                active={dashboardStats.Subscriptions.Active}
                revenue={dashboardStats.Subscriptions.Revenue}/>
            </div>
        </section>  
        
    </main>
  )
}

export default Dashboard
