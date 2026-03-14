import React, {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import './Header.css';
import WhiteTT from '../assets/WhiteTT.png';
import {auth, firestore, storage} from '../../firebase';
import {onAuthStateChanged, signOut} from 'firebase/auth';
import {collection, getDocs, query, where} from 'firebase/firestore';
import {getDownloadURL, ref} from 'firebase/storage';
import {getUserPermissions} from '../Admin/auth';
import {getProfilePictureUrl} from '../../utils/imageUtils';

const Header = () => {
    const [user, setUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const {displayName, email} = currentUser;

                try {
                    // Query users collection to find matching user by email
                    const userQuery = query(
                        collection(firestore, 'users'),
                        where('email', '==', email)
                    );
                    const userSnapshot = await getDocs(userQuery);

                    if (userSnapshot.empty) {
                        console.error("User not found in the system.");
                        setUser(null);
                        return;
                    }

                    const userData = userSnapshot.docs[0].data();
                    const profilePicUrl = await getProfilePictureUrl(userData?.profilePictureUrl, currentUser.photoURL);

                    const [firstName, lastName] = displayName ? displayName.split(' ') : [null, null];
                    setUser({
                        firstName,
                        lastName,
                        email,
                        profilePictureUrl: profilePicUrl
                    });

                    // Get user permissions
                    const permissions = await getUserPermissions(currentUser);
                    setUserPermissions(permissions);

                    // Log visit only once per session
                    if (window.sessionStorage && !window.sessionStorage.getItem('visit-logged')) {
                        fetch('/api/log-visit', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ email }),
                        })
                        .then(() => {
                            window.sessionStorage.setItem('visit-logged', 'true');
                        })
                        .catch((err) => {
                            // Optionally handle error
                            console.error('Failed to log visit:', err);
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
                setUserPermissions([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                setUser(null);
                setUserPermissions([]);
                navigate('/login');
            })
            .catch((error) => {
                console.error('Failed to log out:', error);
            });
    };

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible);
    };

    const handleIconClick = () => {
        setMobileMenuVisible(false);
        navigate('/');
    };

    const toggleMobileMenu = () => {
        setMobileMenuVisible(!mobileMenuVisible);
    };

    const renderAdminLinks = () => {
        const adminLinks = [];
        
        if (userPermissions.includes('user-management')) {
            adminLinks.push(
                <Link key="user-management" to="/admin/user-management" className="dropdown-item">User Management</Link>
            );
        }
        if (userPermissions.includes('bro-dates')) {
            adminLinks.push(
                <Link key="bro-dates" to="/admin/bro-dates" className="dropdown-item">Bro Dates</Link>
            );
        }
        if (userPermissions.includes('scribe-editor')) {
            adminLinks.push(
                <Link key="scribe-editor" to="/scribe-editor" className="dropdown-item">Scribe Editor</Link>
            );
        }
        if (userPermissions.includes('spoon-assassins')) {
            adminLinks.push(
                <Link key="spoon-assassins" to="/admin/spoon-assassins" className="dropdown-item">Spoon Assassins</Link>
            );
        }

        if (adminLinks.length > 0) {
            return adminLinks;
        }
        return null;
    };

    const renderMobileAdminLinks = () => {
        const adminLinks = [];
        
        if (userPermissions.includes('user-management')) {
            adminLinks.push(
                <li key="user-management">
                    <Link to="/admin/user-management" onClick={toggleMobileMenu}>User Management</Link>
                </li>
            );
        }
        if (userPermissions.includes('bro-dates')) {
            adminLinks.push(
                <li key="bro-dates">
                    <Link to="/admin/bro-dates" onClick={toggleMobileMenu}>Bro Dates</Link>
                </li>
            );
        }
        if (userPermissions.includes('scribe-editor')) {
            adminLinks.push(
                <li key="scribe-editor">
                    <Link to="/scribe-editor" onClick={toggleMobileMenu}>Scribe Editor</Link>
                </li>
            );
        }
        if (userPermissions.includes('spoon-assassins')) {
            adminLinks.push(
                <li key="spoon-assassins">
                    <Link to="/admin/spoon-assassins" onClick={toggleMobileMenu}>Spoon Assassins</Link>
                </li>
            );
        }

        if (adminLinks.length > 0) {
            return adminLinks;
        }
        return null;
    };

    return (
        <nav className="header">
            <img src={WhiteTT} alt="Logo" className="logo" onClick={handleIconClick}/>

            {/*Show users profile picture in the Header when on movile*/}
            {/*{user && isMobile && (*/}
            {/*    <div className="mobile-profile">*/}
            {/*        <img src={user.profilePictureUrl} alt="Profile" className="mobile-profile-picture"/>*/}
            {/*    </div>*/}
            {/*)}*/}

            <button className={`hamburger-icon ${mobileMenuVisible ? 'active' : ''}`} onClick={toggleMobileMenu}>
                ☰
            </button>

            <div className={`nav-links ${mobileMenuVisible ? 'visible' : ''}`}>
                <ul>
                    <li className={location.pathname === '/' ? 'active' : ''}><Link to="/"
                                                                                    onClick={toggleMobileMenu}>Home</Link>
                    </li>
                    <li className={location.pathname === '/about-us' ? 'active' : ''}><Link to="/about-us"
                                                                                            onClick={toggleMobileMenu}>About
                        Us</Link></li>
                    <li className={location.pathname === '/meet-the-brothers' ? 'active' : ''}><Link
                        to="/meet-the-brothers" onClick={toggleMobileMenu}>Meet The Brothers</Link></li>
                    <li className={location.pathname === '/rush' ? 'active' : ''}><Link to="/rush"
                                                                                        onClick={toggleMobileMenu}>Rush</Link>
                    </li>
                    <li className={location.pathname === '/alumni' ? 'active' : ''}><Link to="/alumni" onClick={toggleMobileMenu}>Alumni</Link>
                    </li>
                    {user && isMobile && (
                        <>
                            <li className={location.pathname === '/dashboard' ? 'active' : ''}>
                                <Link to="/dashboard" onClick={toggleMobileMenu}>Dashboard</Link>
                            </li>
                            <li className={location.pathname === '/family-tree' ? 'active' : ''}>
                                <Link to="/family-tree" onClick={toggleMobileMenu}>Family Tree</Link>
                            </li>
                            <li className={location.pathname === '/directory' ? 'active' : ''}>
                                <Link to="/directory" onClick={toggleMobileMenu}>Directory</Link>
                            </li>
                            {renderMobileAdminLinks()}
                            <li>
                                <Link to="/" onClick={() => {
                                    handleLogout();
                                    toggleMobileMenu();
                                }}>Logout</Link>
                            </li>
                        </>
                    )}
                    {!user && isMobile && (
                        <li className={location.pathname === '/login' ? 'active' : ''}>
                            <Link to="/login" onClick={toggleMobileMenu}>Login</Link>
                        </li>
                    )}
                </ul>
            </div>

            <div className="login-link">
                <ul>
                    {user ? (
                        <li className="dropdown" onClick={toggleDropdown}>
                            <span className="header-profile" style={{color: 'white', cursor: 'pointer'}}>
                                <span className="header-profile-name">
                                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                                </span>
                                <img src={user.profilePictureUrl} alt="Profile" className="header-profile-picture"/>
                            </span>

                            <div className={`dropdown-menu ${dropdownVisible ? 'open' : ''}`}>
                                <Link to="/dashboard" className="dropdown-item">Dashboard</Link>
                                <Link to="/family-tree" className="dropdown-item">Family Tree</Link>
                                <Link to="/directory" className="dropdown-item">Directory</Link>
                                {renderAdminLinks()}
                                <span onClick={handleLogout} className="dropdown-item">Logout</span>
                            </div>
                        </li>
                    ) : (
                        !isMobile && <li className={location.pathname === '/login' ? 'active' : ''}><Link to="/login">Login</Link></li>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Header;