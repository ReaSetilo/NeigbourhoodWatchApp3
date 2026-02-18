import { Link, NavLink, useNavigate } from "react-router"
import { sidebarItems } from "~/constants"
import { cn } from "~/lib/utils"

const NavItems = ({handleClick}: {handleClick?: () => void}) => {
    const navigate = useNavigate()

    const user = {
        name: 'Guest',
        email: '',
        imageURL: "/assets/images/david.webp"
    }

    const handleLogout = () => navigate('/')

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
                    className="cursor-pointer"
                    title="Sign Out"
                >
                    <img src="/assets/icons/logout.svg" alt="logout" className="size-6"/>
                </button>
            </footer>
        </div>
    </section>
  )
}

export default NavItems