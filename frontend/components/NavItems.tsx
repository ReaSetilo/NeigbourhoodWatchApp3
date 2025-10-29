import { Link, NavLink, useNavigate } from "react-router"
import { sidebarItems } from "~/constants"
import { cn } from "~/lib/utils"
import { supabase } from '/NeigbourhoodWatchApp3/frontend/config/supabase'
import { useState } from "react"


const NavItems = ({handleClick}: {handleClick?: () => void}) => {
    const navigate = useNavigate()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const user = {
        name: 'Reatile',
        email: 'reasetilo43@gmail.com',
        imageURL: "/assets/images/david.webp"
    }

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true)
            console.log('Signing out...')
            
            const { error } = await supabase.auth.signOut()
            
            if (error) {
                console.error('Error signing out:', error)
                alert('Failed to sign out. Please try again.')
            } else {
                console.log('Successfully signed out')
                // Redirect to sign-in page
                window.location.href = '/'
            }
        } catch (error) {
            console.error('Logout error:', error)
            alert('An error occurred while signing out.')
        } finally {
            setIsLoggingOut(false)
        }
    }

  return (
    <section className="nav-items">
        <Link to='/' className="link-logo">
            <img src="/assets/images/TrakmLogo.jpg" alt="logo" className="size-[50px]"/>
            <h1>TRAKM</h1>
        </Link>
        <div className="container">
            <nav>
                {sidebarItems.map(({id, href, icon, label}) => (
                    <NavLink to={href} key={id}>
                        {({isActive}: {isActive: boolean}) => (
                            <div className={cn('group nav-item', {
                                'bg-primary-100 !text-white' : isActive
                            })}
                            onClick={handleClick}>
                                <img
                                src={icon}
                                alt={label}
                                className={`group-hover:brightness-0 size-7 group-hover:invert ${isActive ? 'brightness-0 invert' : 'text-dark-200'}`}
                                />
                                {label}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>
            <footer className="nav-footer">
                <img src={user?.imageURL} alt={user?.name}/>
                <article>
                    <h2>{user?.name}</h2>
                    <p>{user?.email}</p>
                </article>
                <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sign Out"
                >
                    <img
                    src="/assets/icons/logout.svg"
                    alt="logout"
                    className={`size-6 ${isLoggingOut ? 'animate-pulse' : ''}`}/>
                </button>
            </footer>
        </div>
    </section>
  )
}

export default NavItems