import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import * as Navs from '@syncfusion/ej2-react-navigations'
import { MobileSidebar, NavItems } from 'components'
import { supabase } from '/NeigbourhoodWatchApp3/frontend/config/supabase'

const AdminLayout = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.log('No active session, redirecting to sign in')
          navigate('/sign-in', { replace: true })
          return
        }

        setUser(session.user)
        setLoading(false)
      } catch (error) {
        console.error('Auth check error:', error)
        navigate('/sign-in', { replace: true })
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        console.log('User signed out, redirecting...')
        setUser(null)
        navigate('/sign-in', { replace: true })
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If no user after loading, don't render (redirect is happening)
  if (!user) {
    return null
  }

  // Render admin layout for authenticated users
  return (
    <div className='admin-layout'>
      <MobileSidebar/>
      <aside className='w-full max-w-[270px] hidden lg:block'>
        <Navs.SidebarComponent width={270} enableGestures={false}>
          <NavItems />
        </Navs.SidebarComponent>
      </aside>
      <aside className='children'>
        <Outlet/>
      </aside>
    </div>
  )
}

export default AdminLayout