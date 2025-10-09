import Header from 'components/Header'
import React from 'react'

const Dashboard = () => {
    const user={name:"Reatile"};
  return (
    <main className='dashboard wrapper'>
        <Header
        title={`Welcome ${user.name} 👋`}
        description="Track activity and manage the system"/>
        Actual dashboard stuff goes here
    </main>
  )
}

export default Dashboard
