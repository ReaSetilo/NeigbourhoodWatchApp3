import React from 'react'

interface StatsCardProps {
  headerTitle: string;
  total?: number;
  suspended?: number;
  admins?: number;
  members?: number;
  officers?: number;
  Otp?: number;
  twoFA?: number;
  today?: string;
  alerts?: string;
  missedZones?: string;
  active?: number;
  revenue?: number;
}

const StatsCard = ({ 
  headerTitle, 
  total, 
  suspended, 
  admins, 
  members, 
  officers,
  Otp,
  twoFA,
  today,
  alerts,
  missedZones,
  active,
  revenue
}: StatsCardProps) => {
  return (
    <article className='stats-card'>  
      <h3 className='text-lg font-semibold text-dark-200 mb-4'>{headerTitle}</h3>
      
      <div className='flex flex-col gap-2'>
        {/* Monitored Houses */}
        {total !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Total:</span>
            <span className='font-medium text-dark-200'>{total}</span>
          </div>
        )}
        
        {/* User Overview */}
        {admins !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Admins:</span>
            <span className='font-medium text-dark-200'>{admins}</span>
          </div>
        )}
        {members !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Members:</span>
            <span className='font-medium text-dark-200'>{members}</span>
          </div>
        )}
        {officers !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Officers:</span>
            <span className='font-medium text-dark-200'>{officers}</span>
          </div>
        )}
        
        {/* Security Log */}
        {Otp !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>OTP Sent:</span>
            <span className='font-medium text-dark-200'>{Otp}</span>
          </div>
        )}
        {twoFA !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>2FA Failures:</span>
            <span className='font-medium text-red-500'>{twoFA}</span>
          </div>
        )}
        
        {/* Patrol Summary */}
        {today && (
          <div className='stat-item'>
            <span className='text-gray-600'>Today:</span>
            <span className='font-medium text-dark-200'>{today}</span>
          </div>
        )}
        {alerts && (
          <div className='stat-item'>
            <span className='text-gray-600'>Alerts:</span>
            <span className='font-medium text-orange-500'>{alerts}</span>
          </div>
        )}
        {missedZones && (
          <div className='stat-item'>
            <span className='text-gray-600'>Missed:</span>
            <span className='font-medium text-red-500'>{missedZones}</span>
          </div>
        )}
        
        {/* Subscriptions */}
        {active !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Active:</span>
            <span className='font-medium text-green-600'>{active}</span>
          </div>
        )}
        {revenue && (
          <div className='stat-item'>
            <span className='text-gray-600'>Revenue: P </span>
            <span className='font-medium text-green-600'>{revenue}</span>
          </div>
        )}
        
        {/* Show suspended count if present */}
        {suspended !== undefined && (
          <div className='stat-item'>
            <span className='text-gray-600'>Suspended:</span>
            <span className='font-medium text-red-500'>{suspended}</span>
          </div>
        )}
      </div>
    </article>
  )
}

export default StatsCard