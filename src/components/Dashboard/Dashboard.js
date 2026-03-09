import React, { useEffect, useState } from 'react';
import { auth, firestore } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import EditUserPopup from './EditUserPopup';
import { getUpcomingEvents, initClient } from './googleCalendarService';
import { getProfilePictureUrl } from '../../utils/imageUtils';

// Constants
const PROGRESS_GOAL = 2000;

const formatEventDate = (event) => {
    if (event.start.date && !event.start.dateTime) {
        const dateParts = event.start.date.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        return new Date(year, month, day).toLocaleDateString();
    }
    return new Date(event.start.dateTime).toLocaleString();
};

const getEventMonth = (event) => {
    const date = event.start.date ? new Date(event.start.date) : new Date(event.start.dateTime);
    return date.toLocaleString('default', { month: 'short' });
}

const getEventDay = (event) => {
    const date = event.start.date ? new Date(event.start.date.replace(/-/g, '/')) : new Date(event.start.dateTime);
    return date.getDate();
}

const getEventTime = (event) => {
    if (event.start.date && !event.start.dateTime) return "All Day";
    return new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Reusable Components

const PointsCard = ({ points, userId }) => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [eventPoints, setEventPoints] = useState({});
    const [allEvents, setAllEvents] = useState([]);
    const [expandedQuarters, setExpandedQuarters] = useState({});
    const [quarterConfigs, setQuarterConfigs] = useState({});

    // Calculate progress
    const progressPercentage = Math.min((points / PROGRESS_GOAL) * 100, 100);
    const pointsNeeded = Math.max(PROGRESS_GOAL - points, 0);

    // Fetch breakdown data
    useEffect(() => {
        const fetchPointsData = async () => {
            try {
                const [pointsDoc, eventsSnapshot] = await Promise.all([
                    getDoc(doc(firestore, 'eventPoints', userId)),
                    getDocs(collection(firestore, 'events'))
                ]);

                if (pointsDoc.exists()) {
                    setEventPoints(pointsDoc.data());
                }
                const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllEvents(eventsList);

                // Fetch quarter configs
                const configsSnapshot = await getDocs(collection(firestore, 'quarterConfigs'));
                const configsData = {};
                configsSnapshot.docs.forEach(doc => {
                    configsData[doc.id] = doc.data().counts !== false;
                });
                setQuarterConfigs(configsData);
            } catch (error) {
                console.error('Error fetching points data:', error);
            }
        };
        if (userId && showBreakdown) {
            fetchPointsData();
        }
    }, [userId, showBreakdown]);

    const toggleQuarter = (quarter) => {
        setExpandedQuarters(prev => ({ ...prev, [quarter]: !prev[quarter] }));
    };

    const groupedEvents = allEvents.reduce((groups, event) => {
        const quarter = event.quarter || 'Other';
        if (!groups[quarter]) groups[quarter] = [];
        groups[quarter].push(event);
        return groups;
    }, {});

    const sortedQuarters = Object.keys(groupedEvents).sort((a, b) => {
        const parseQuarter = (q) => {
            const parts = q.split(' ');
            if (parts.length < 2) return 9999;
            const season = parts[0];
            const year = parts[1];
            const seasonScore = season === 'Spring' ? 0 : (season === 'Fall' ? 1 : 2);
            return parseInt(year) * 10 + seasonScore;
        };
        return parseQuarter(a) - parseQuarter(b);
    });

    const handleCloseBreakdown = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowBreakdown(false);
            setIsClosing(false);
        }, 300);
    };

    return (
        <section className="glass p-8 rounded-3xl flex flex-col justify-between group hover:border-primary/30 transition-all">
            <div>
                <div className="flex items-center gap-3 mb-8">
                    <span className="material-icons-outlined text-primary">analytics</span>
                    <h2 className="text-xl font-anton uppercase tracking-wide">Member Status</h2>
                </div>
                <div className="mb-6">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-sm font-medium text-slate-500 uppercase">Points Progress</span>
                        <span className="text-2xl font-anton text-primary uppercase tracking-tight">{points} <span className="text-sm font-sans text-slate-500 normal-case">/ {PROGRESS_GOAL}</span></span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary progress-glow animate-pulse" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {pointsNeeded > 0
                        ? `You're ${pointsNeeded} points away from meeting this quarter's requirement. Keep it up!`
                        : "You've met the requirement! Great job!"}
                </p>
            </div>
            <button
                className="w-full py-4 glass rounded-xl hover:bg-primary hover:text-white transition-all duration-300 font-semibold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                onClick={() => setShowBreakdown(true)}
            >
                View Breakdown <span className="material-icons-outlined text-sm">trending_up</span>
            </button>

            {showBreakdown && (
                <>
                    <div className={`admin-edit-user-overlay ${isClosing ? 'closing' : ''}`} onClick={handleCloseBreakdown} />
                    <div className={`admin-edit-user ${isClosing ? 'closing' : ''}`}>
                        <h2>Points Breakdown</h2>
                        <div className="points-breakdown">
                            {sortedQuarters.map(quarter => {
                                const quarterEvents = groupedEvents[quarter].filter(event => (eventPoints[event.id] || 0) > 0);
                                if (quarterEvents.length === 0) return null;
                                const quarterTotal = quarterEvents.reduce((sum, e) => sum + (eventPoints[e.id] || 0), 0);
                                const isExpanded = expandedQuarters[quarter];

                                return (
                                    <div key={quarter} className={`quarter-group ${quarterConfigs[quarter] === false ? 'excluded opacity-50' : ''}`}>
                                        <div
                                            className="event-points-row quarter-summary-row"
                                            onClick={() => toggleQuarter(quarter)}
                                            style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="event-name">{quarter} {isExpanded ? '▼' : '▶'}</span>
                                                {quarterConfigs[quarter] === false && (
                                                    <span className="text-[10px] text-red-500 font-normal uppercase tracking-wider">Not contributing to total</span>
                                                )}
                                            </div>
                                            <span className={`event-points ${quarterConfigs[quarter] === false ? 'line-through' : ''}`}>{quarterTotal} points</span>
                                        </div>
                                        {isExpanded && quarterEvents.map(event => (
                                            <div key={event.id} className="event-points-row sub-event-row">
                                                <span className="event-name" style={{ paddingLeft: '20px' }}>{event.name}</span>
                                                <span className="event-points">{eventPoints[event.id]} points</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            <div className="event-points-row total">
                                <span className="event-name">Total</span>
                                <span className="event-points">{points} points</span>
                            </div>
                        </div>
                        <div className="admin-buttons">
                            <button className="close" onClick={handleCloseBreakdown}>Close</button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
};

const EventsCard = ({ events }) => (
    <section className="glass p-8 rounded-3xl group hover:border-gold/30 transition-all h-[500px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-8 sticky top-0 bg-transparent z-10">
            <span className="material-icons-outlined text-gold">calendar_month</span>
            <h2 className="text-xl font-anton uppercase tracking-wide">Upcoming Events</h2>
        </div>
        <div className="space-y-6">
            {events.length > 0 ? events.map((event, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center glass rounded-lg border-gold/20">
                        <span className="text-[10px] uppercase font-bold text-gold">{getEventMonth(event)}</span>
                        <span className="text-lg font-bold">{getEventDay(event)}</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">{event.summary}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <span className="material-icons-outlined text-xs">schedule</span> {getEventTime(event)}
                        </p>
                    </div>
                </div>
            )) : (
                <p className="text-slate-500 text-sm">No upcoming events found.</p>
            )}
        </div>
    </section>
);

const BroDatesCard = ({ broDateGroup }) => {
    // We only have names/emails, not profile pics for all members usually. 
    // We'll use a placeholder or check if we can get them. 
    // For now, using placeholders for consistency with the design if URL missing.
    // Ideally we would fetch them.

    return (
        <section className="glass p-8 rounded-3xl flex flex-col justify-between group hover:border-slate-500/30 transition-all">
            <div>
                <div className="flex items-center gap-3 mb-8">
                    <span className="material-icons-outlined text-slate-400">handshake</span>
                    <h2 className="text-xl font-anton uppercase tracking-wide">BroDates</h2>
                </div>
                {broDateGroup.length > 0 ? (
                    <>
                        <div className="flex -space-x-4 mb-8">
                            {broDateGroup.map((member, i) => (
                                <img
                                    key={i}
                                    alt={`${member.firstName}`}
                                    className="w-16 h-16 rounded-full border-4 border-white object-cover hover:scale-110 transition-transform cursor-pointer"
                                    src={member.profilePictureUrl || "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg"}
                                    title={`${member.firstName} ${member.lastName}`}
                                />
                            ))}
                        </div>
                        <div className="space-y-2 mb-8">
                            <p className="text-sm font-semibold">Your Group for the Week:</p>
                            <ul className="text-xs text-slate-500 space-y-1">
                                {broDateGroup.map((member, i) => (
                                    <li key={i}>{member.firstName} {member.lastName}</li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <p className="text-slate-500 mb-8">No BroDate group assigned.</p>
                )}
            </div>
            {/*<button className="w-full py-4 bg-primary text-white rounded-xl hover:bg-primary/80 transition-all duration-300 font-semibold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20">*/}
            {/*    Organize Hangout <span className="material-icons-outlined text-sm">rocket_launch</span>*/}
            {/*</button>*/}
        </section>
    );
}

const SpoonAssassinsCard = ({ userId }) => {
    const [spoonData, setSpoonData] = useState(null);
    const [aliveCount, setAliveCount] = useState(0);
    const [totalActiveCount, setTotalActiveCount] = useState(0);
    const [roundEndTime, setRoundEndTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const fetchSpoonInfo = async () => {
            if (!userId) return;
            try {
                // Fetch user's own target info
                let targetDoc = await getDoc(doc(firestore, 'targets', userId));
                let currentSpoonData = targetDoc.exists() ? targetDoc.data() : null;

                // Logic: If current target is eliminated, get their target, recursively
                if (currentSpoonData && currentSpoonData.targetId && currentSpoonData.isEliminated === false) {
                    let tempTargetId = currentSpoonData.targetId;
                    let targetIsEliminated = false;
                    let currentTargetInfo = null;

                    // Check if current target is eliminated
                    const checkTargetDoc = await getDoc(doc(firestore, 'targets', tempTargetId));
                    if (checkTargetDoc.exists() && checkTargetDoc.data().isEliminated) {
                        targetIsEliminated = true;
                        currentTargetInfo = checkTargetDoc.data();
                    }

                    // Loop to find the next alive target in the chain
                    while (targetIsEliminated && currentTargetInfo && currentTargetInfo.targetId) {
                        const nextTargetId = currentTargetInfo.targetId;
                        const nextTargetDoc = await getDoc(doc(firestore, 'targets', nextTargetId));

                        if (nextTargetDoc.exists()) {
                            const nextTargetData = nextTargetDoc.data();
                            if (nextTargetData.isEliminated) {
                                tempTargetId = nextTargetId;
                                currentTargetInfo = nextTargetData;
                            } else {
                                // Found an alive target!
                                targetIsEliminated = false;
                                currentTargetInfo = nextTargetData;
                            }
                        } else {
                            // Target chain broken or target doc missing
                            break;
                        }
                    }

                    // If we found a new alive target, update the user's target document
                    if (currentTargetInfo && currentTargetInfo.userId !== currentSpoonData.targetId && !currentTargetInfo.isEliminated) {
                        const updatedData = {
                            ...currentSpoonData,
                            targetId: currentTargetInfo.userId,
                            targetName: `${currentTargetInfo.firstName} ${currentTargetInfo.lastName}`.trim()
                        };
                        await setDoc(doc(firestore, 'targets', userId), updatedData);
                        currentSpoonData = updatedData;
                    }
                }

                setSpoonData(currentSpoonData);

                // Fetch all targets to count alive players
                const targetsSnapshot = await getDocs(collection(firestore, 'targets'));
                const allTargets = targetsSnapshot.docs.map(doc => doc.data());
                setAliveCount(allTargets.filter(t => !t.isEliminated).length);
                setTotalActiveCount(allTargets.length);

                // Fetch round end time from config
                try {
                    const configDoc = await getDoc(doc(firestore, 'game_config', 'spoon_assassins'));
                    if (configDoc.exists()) {
                        const data = configDoc.data();
                        if (data.roundEndTime) {
                            // Handle both Timestamp and string formats
                            setRoundEndTime(data.roundEndTime.toDate ? data.roundEndTime.toDate() : new Date(data.roundEndTime));
                        }
                    }
                } catch (configError) {
                    console.warn('Could not fetch round timer config:', configError.message);
                }
            } catch (error) {
                console.error('Error fetching Spoon Assassins data:', error);
            }
        };

        fetchSpoonInfo();
    }, [userId]);

    useEffect(() => {
        if (!roundEndTime) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = roundEndTime - now;

            if (diff <= 0) {
                setTimeLeft('Round Ended');
                clearInterval(timer);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [roundEndTime]);

    // If there's no game active at all, don't show the card
    if (!spoonData && totalActiveCount === 0) return null;

    return (
        <section className="glass p-8 rounded-3xl flex flex-col justify-between group hover:border-primary/30 transition-all border border-transparent">
            <div>
                <div className="flex items-center gap-3 mb-8 text-primary">
                    <span className="material-icons-outlined">gps_fixed</span>
                    <h2 className="text-xl font-anton uppercase tracking-wide text-slate-800">Spoon Assassins</h2>
                </div>

                <div className="space-y-6 mb-8">
                    {spoonData && !spoonData.isEliminated ? (
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Active Objective</p>
                            <p className="text-2xl font-anton text-primary uppercase italic leading-tight tracking-tight">Eliminate: {spoonData.targetName}</p>
                        </div>
                    ) : spoonData?.isEliminated ? (
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                            <p className="text-[10px] uppercase font-bold text-red-500 mb-1 tracking-widest">Status</p>
                            <p className="text-2xl font-anton text-red-600 uppercase italic tracking-tight">KILLED</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Status</p>
                            <p className="text-2xl font-anton text-slate-400 uppercase italic tracking-tight">NO TARGET ASSIGNED</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Round Clock</p>
                            <p className="text-sm font-bold font-mono tracking-tight text-slate-700">{timeLeft || 'Standby...'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Survivors</p>
                            <p className="text-sm font-bold text-slate-700">{aliveCount} / {totalActiveCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <a
                href="https://docs.google.com/document/d/1DmNGhpRPcp2gjwYMq4Eh3rGO87Pm7l-dwk-QgcfO22g/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-300 font-semibold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 text-slate-600"
            >
                Rules <span className="material-icons-outlined text-sm">open_in_new</span>
            </a>
        </section>
    );
};

const FooterLinks = ({ user }) => {
    // Mapping roles to links, similar to old AdminButtons
    // If user has access to any admin feature, show relevant links.
    // The design has fixed links in footer. We will show them but maybe disable/hide if no permission? 
    // The design implies these are standard footer links.

    const links = [
        { name: 'Scribe Editor', path: '/scribe-editor', roles: ['Webmaster', 'Scribe'] },
        { name: 'Admin', path: '/admin', roles: ['Webmaster'] },
        { name: 'User Management', path: '/admin/user-management', roles: ['Webmaster'] },
        { name: 'Manage Brodates', path: '/admin/bro-dates', roles: ['Webmaster', 'Brotherhood Chair', 'Mediation Chair'] },
        { name: 'Spoon Assassins', path: '/admin/spoon-assassins', roles: ['Webmaster', 'Brotherhood Chair'] }
    ];

    return (
        <footer className="mt-16 pt-8 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 uppercase text-[10px] font-bold tracking-[0.2em] text-slate-500">
                {links.map(link => {
                    if (user && link.roles.includes(user.role)) {
                        return <Link key={link.name} to={link.path} className="hover:text-gold transition-colors">{link.name}</Link>
                    }
                    return null;
                })}
            </div>
        </footer>
    );
}

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [points, setPoints] = useState(0);
    const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
    const [events, setEvents] = useState([]);
    const [broDateGroup, setBroDateGroup] = useState([]);

    // Fetch user data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                try {
                    const userQuery = query(collection(firestore, 'users'), where('email', '==', currentUser.email));
                    const [userSnapshot, broDatesSnapshot] = await Promise.all([
                        getDocs(userQuery),
                        getDocs(collection(firestore, 'brodates'))
                    ]);

                    if (!userSnapshot.empty) {
                        const userData = userSnapshot.docs[0].data();
                        const userId = userSnapshot.docs[0].id;

                        const profilePicUrl = await getProfilePictureUrl(userData?.profilePictureUrl, currentUser.photoURL);

                        const broDates = broDatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const userGroup = broDates.find(group => group.members.some(m => m.email === currentUser.email));

                        // Try to populate bro date group with PFP if we can, else just raw data
                        // NOTE: In a real app we might fetch user docs for these emails to get their PFPs
                        // For now we use what we have in the group object or defaults.

                        setUser({ ...userData, id: userId, profilePictureUrl: profilePicUrl });
                        setPoints(userData.points || 0);
                        setBroDateGroup(userGroup ? userGroup.members : []);
                    } else {
                        setError('User data not found');
                    }
                } catch (err) {
                    console.error('Error fetching data:', err);
                    setError('Failed to fetch user data.');
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                await initClient();
                const upcomingEvents = await getUpcomingEvents();
                setEvents(upcomingEvents);
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };
        fetchEvents();
    }, []);



    if (loading) return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
    if (!user) return <div className="flex h-screen items-center justify-center">Please log in.</div>;

    return (
        <div className="bg-white font-sans text-slate-800 transition-colors duration-300 min-h-screen">
            <div className="fixed inset-0 -z-10 pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-gold/10 blur-[100px] rounded-full"></div>
            </div>

            {/* Note: Global Header is rendered by App.js usually. The provided design had a Nav, which we omit to avoid duplication, or assume this replaces it. */}

            <main className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12 flex flex-col md:flex-row items-center md:items-end gap-8 animate-gradient rounded-3xl p-8 bg-white shadow-xl">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-gold rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            alt={`${user.firstName} Profile`}
                            className="relative w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-white/10"
                            src={user.profilePictureUrl || "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg"}
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                            <h1 className="text-4xl md:text-5xl font-anton uppercase tracking-tight leading-tight">Welcome, {user.firstName}</h1>
                            <button
                                className="p-2 glass rounded-full hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                                onClick={() => setIsEditPopupOpen(true)}
                            >
                                <span className="material-icons-outlined text-sm">edit</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm text-slate-400 uppercase tracking-widest font-medium">
                            <div>
                                <span className="block text-slate-500 text-[10px] mb-1">Email</span>
                                <span className="text-slate-700 lowercase">{user.email}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-[10px] mb-1">Role</span>
                                <span className="text-gold">{user.role}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-[10px] mb-1">Major</span>
                                <span className="text-slate-700">{user.major}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-[10px] mb-1">Class</span>
                                <span className="text-slate-700">{user.class} Class</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    {/*ENABLE AND RE ENABLE CARD AS NEEDED*/}
                    <SpoonAssassinsCard userId={user.id} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <PointsCard points={points} userId={user.id} />
                        <EventsCard events={events} />
                        <BroDatesCard broDateGroup={broDateGroup} />
                    </div>
                </div>

                <FooterLinks user={user} />
            </main>



            {isEditPopupOpen && (
                <EditUserPopup
                    user={user}
                    onClose={() => setIsEditPopupOpen(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;