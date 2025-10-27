import React from 'react'
import { Link, useNavigate } from 'react-router'
import * as Buttons from '@syncfusion/ej2-react-buttons'

const LandingPage = () => {
    const navigate = useNavigate();

    const handleSignIn = () => {
        navigate('/sign-in');
    };
    
  return (
    <main className='auth'>
        <section className='size-full glassmorphism flex-center px-6'>
            <div className='sign-in-card'>
                <header className='header'>
                    <Link to='/'>
                        <img src='/assets/icons/logo.svg'
                        alt='logo'
                        className='size-[30px]'/>
                    </Link>
                    <h1 className='p-28-bold text-dark-100'>TRAKM</h1>
                </header>
                <article>
                    <h2 className='p-28-bold text-dark-100 text-center'>Start monitoring</h2>
                    <p className='p-18-regular text-center text-gray-100 !leading-7'>Sign in with email to manage user accounts, houses, and employees</p>
                </article>
                <Buttons.ButtonComponent 
                    iconCss="e-search-icon" 
                    className='button-class !h-11 !w-full'
                    onClick={handleSignIn}
                >
                    <img src='assets/icons/emal-icon.png'                    
                    className='size-5'/>
                    <span className='p-18-semibold text-white'>Sign in with email</span>
                </Buttons.ButtonComponent>
            </div>
        </section>
    </main>
  )
}

export default LandingPage