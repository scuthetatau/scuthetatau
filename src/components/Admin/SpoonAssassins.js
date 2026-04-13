import React, { useEffect, useState, useRef } from 'react';
import { firestore } from '../../firebase';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { checkUserRole } from './auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

const SpoonAssassins = () => {
    // Game Data State
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [eliminatedUsers, setEliminatedUsers] = useState([]);
    const [pendingIntel, setPendingIntel] = useState([]);
    const [roundEndTimeStr, setRoundEndTimeStr] = useState('');

    // UI State
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('manifest'); // 'manifest' | 'builder'
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

    // Builder State
    const [chain, setChain] = useState([{ userId: '', targetId: '' }]);
    
    // Drag and Drop Refs
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const navigate = useNavigate();

    // Check Auth & Fetch Data
    useEffect(() => {
        // First check permission redirect
        const unsubscribeRole = checkUserRole(navigate, 'spoon-assassins');

        // Then wait for auth to be ready before fetching
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('SpoonAssassins: User authenticated, fetching data...', user.email);
                fetchData(user);
            } else {
                console.log('SpoonAssassins: No user, skipping fetch.');
                setLoading(false);
            }
        });

        return () => {
            if (unsubscribeRole) unsubscribeRole();
            unsubscribeAuth();
        };
    }, [navigate]);

    const fetchData = async (user) => {
        setLoading(true);
        console.log('SpoonAssassins: Starting fetchData for', user?.email);
        try {
            // 1. Fetch Users FIRST (Publicly readable)
            console.log('SpoonAssassins: Fetching users...');
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            // Filter out dropped users so they don't get added to target chains
            const usersList = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(u => !u.dropped);
            setUsers(usersList);

            // 2. Identify Current User & Check Admin Status
            const currentUser = usersList.find(u => u.email === user.email);
            if (!currentUser) {
                console.warn('SpoonAssassins: Current user not found in users collection.');
            }

            // 3. Attempt to Fetch Restricted Data (Targets)
            try {
                await fetchRestrictedData();
            } catch (error) {
                if (error.code === 'permission-denied') {
                    console.warn('SpoonAssassins: Permission denied fetching targets. Checking if admin sync is needed...');

                    if (currentUser && (currentUser.role === 'Webmaster' || currentUser.role === 'Brotherhood Chair' || currentUser.role === 'Mediation Chair')) {
                        console.log('SpoonAssassins: User appears to be admin. Attempting to sync admin privileges...');
                        await syncAdminPrivileges(currentUser);
                        console.log('SpoonAssassins: Admin privileges synced. Retrying fetch...');
                        await fetchRestrictedData();
                    } else {
                        throw error; // Not an admin, real permission error
                    }
                } else {
                    throw error;
                }
            }

        } catch (error) {
            console.error('SpoonAssassins: Error fetching data:', error);
            showNotification('error', 'Error loading data. Check permissions.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRestrictedData = async () => {
        // Fetch Targets
        const targetsSnapshot = await getDocs(collection(firestore, 'targets'));
        const targetsList = targetsSnapshot.docs.map((doc) => doc.data());

        // Fetch Attempts
        const attemptsSnapshot = await getDocs(collection(firestore, 'assassination_attempts'));
        const attemptsList = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(attempt => attempt.status === 'pending');

        setAssignments(targetsList);
        setPendingIntel(attemptsList);

        const eliminatedList = targetsList
            .filter(target => target.isEliminated)
            .map(target => target.userId);
        setEliminatedUsers(eliminatedList);
        
        try {
            const configDoc = await getDoc(doc(firestore, 'game_config', 'spoon_assassins'));
            if (configDoc.exists()) {
                const data = configDoc.data();
                if (data.roundEndTime) {
                    const dateObj = data.roundEndTime.toDate ? data.roundEndTime.toDate() : new Date(data.roundEndTime);
                    const tzOffset = dateObj.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                    setRoundEndTimeStr(localISOTime);
                }
            }
        } catch (e) {
            console.error('SpoonAssassins: Could not fetch config', e);
        }

        console.log('SpoonAssassins: Restricted data fetched successfully.');
    };

    const syncAdminPrivileges = async (user) => {
        try {
            // Write to /admins/{email} to satisfy the isAdmin() helper in rules
            // Match the rule: allow write: if request.auth != null && request.auth.token.email == email && ...
            await setDoc(doc(firestore, 'admins', user.email), {
                userId: user.id,
                email: user.email,
                role: user.role,
                syncedAt: new Date().toISOString()
            });
            showNotification('success', 'Admin privileges synced successfully.');
        } catch (error) {
            console.error('SpoonAssassins: Failed to sync admin privileges:', error);
            // Note: If this fails, it might be because the rule for WRITING to admins also fails if the validation don't match exactly.
            // The rule requires: request.resource.data.userId == user.id AND ...role == user.role
            throw error;
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- Logic Helpers ---

    const formatUserName = (user) => {
        if (!user) return 'Unknown';
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        return user.displayName || 'Unknown';
    };

    const getUserById = (userId) => users.find(user => user.id === userId);


    // --- Chain Builder Logic ---

    const addPlayerToChain = () => setChain([...chain, { userId: '', targetId: '' }]);

    const removePlayerFromChain = (index) => {
        const newChain = [...chain];
        newChain.splice(index, 1);
        setChain(newChain);
    };

    const updatePlayerInChain = (index, userId) => {
        const newChain = [...chain];
        newChain[index].userId = userId;
        setChain(newChain);
    };

    // Drag and Drop Logic
    const handleDragStart = (e, position) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) return;

        const newChain = [...chain];
        const draggedContent = newChain.splice(dragItem.current, 1)[0];
        newChain.splice(dragOverItem.current, 0, draggedContent);

        dragItem.current = null;
        dragOverItem.current = null;

        setChain(newChain);
    };

    // Auto-link chain targets
    useEffect(() => {
        if (chain.length > 0) {
            const newChain = [...chain];
            for (let i = 0; i < newChain.length; i++) {
                if (i < newChain.length - 1) {
                    newChain[i].targetId = newChain[i + 1].userId;
                } else {
                    newChain[i].targetId = newChain[0].userId; // Loop back to start
                }
            }
            // Only update if changes to avoid infinite loop
            const currentIds = chain.map(c => c.targetId).join(',');
            const newIds = newChain.map(c => c.targetId).join(',');
            if (currentIds !== newIds) {
                setChain(newChain);
            }
        }
    }, [chain.map(item => item.userId).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const randomizeChain = () => {
        if (users.length < 2) {
            showNotification('error', 'Not enough users to randomize.');
            return;
        }

        // Fisher-Yates Shuffle
        const shuffled = [...users];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Create circular chain
        const newChain = shuffled.map((user, index) => ({
            userId: user.id,
            targetId: shuffled[(index + 1) % shuffled.length].id
        }));

        setChain(newChain);
        showNotification('success', 'Randomized target chain created.');
    };

    const isValidChain = () => {
        const userIds = chain.map(item => item.userId).filter(id => id !== '');
        const uniqueUserIds = new Set(userIds);
        if (userIds.length === 0) return false;
        if (uniqueUserIds.size !== userIds.length) return false;
        return !chain.some(item => item.userId === '' || item.targetId === '');
    };

    const saveAssignments = async () => {
        // Filter out empty entries and validation
        const validChainItems = chain.filter(item => item.userId && item.userId.trim() !== '');

        if (validChainItems.length < 2) {
            showNotification('error', 'Must have at least 2 operatives to save.');
            return;
        }

        const userIds = validChainItems.map(i => i.userId);
        const uniqueUserIds = new Set(userIds);
        if (uniqueUserIds.size !== userIds.length) {
            showNotification('error', 'Duplicate operatives found in chain.');
            return;
        }

        try {
            setLoading(true);
            // Clear existing targets
            const promises = assignments.map(assignment =>
                deleteDoc(doc(firestore, 'targets', assignment.userId))
            );
            await Promise.all(promises);

            const newAssignments = [];
            // Re-link valid items in a closed loop
            for (let i = 0; i < validChainItems.length; i++) {
                const item = validChainItems[i];
                // Circular linking: Current -> Next (wrapping around)
                const nextItem = validChainItems[(i + 1) % validChainItems.length];

                const user = getUserById(item.userId);
                const target = getUserById(nextItem.userId);

                if (user && target) {
                    const assignment = {
                        userId: user.id,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        targetId: target.id,
                        targetName: `${target.firstName || ''} ${target.lastName || ''}`,
                        isEliminated: false
                    };
                    await setDoc(doc(firestore, 'targets', user.id), assignment);
                    newAssignments.push(assignment);
                }
            }

            setAssignments(newAssignments);
            setEliminatedUsers([]);
            // Update chain to match the cleaned version
            setChain(validChainItems.map((item, i) => ({
                userId: item.userId,
                targetId: validChainItems[(i + 1) % validChainItems.length].userId
            })));

            showNotification('success', 'New targets assigned successfully!');
            setViewMode('manifest');
        } catch (error) {
            console.error('Error saving assignments:', error);
            showNotification('error', 'Failed to save assignments.');
        } finally {
            setLoading(false);
        }
    };

    // --- Action Handlers ---

    const toggleEliminationStatus = async (userId) => {
        try {
            const isEliminated = !eliminatedUsers.includes(userId);
            const targetRef = doc(firestore, 'targets', userId);
            await setDoc(targetRef, { isEliminated }, { merge: true });

            if (isEliminated) {
                setEliminatedUsers([...eliminatedUsers, userId]);
            } else {
                setEliminatedUsers(eliminatedUsers.filter(id => id !== userId));
            }
            showNotification('success', `User status updated to ${isEliminated ? 'Eliminated' : 'Active'}`);
        } catch (error) {
            console.error('Error updating status:', error);
            showNotification('error', 'Failed to update status.');
        }
    };

    const handleIntelDecision = async (attempt, approved) => {
        try {
            const attemptRef = doc(firestore, 'assassination_attempts', attempt.id);
            await updateDoc(attemptRef, {
                status: approved ? 'approved' : 'rejected',
                decisionTimestamp: new Date().toISOString()
            });

            if (approved) {
                // Eliminate the target
                await toggleEliminationStatus(attempt.targetId);
            }

            // Remove from local state
            setPendingIntel(pendingIntel.filter(p => p.id !== attempt.id));
            showNotification('success', `Intel ${approved ? 'APPROVED' : 'REJECTED'}`);
        } catch (error) {
            console.error('Error processing intel:', error);
            showNotification('error', 'Failed to process intel.');
        }
    };

    const handleSaveRoundTime = async () => {
        try {
            if (!roundEndTimeStr) {
                await setDoc(doc(firestore, 'game_config', 'spoon_assassins'), { roundEndTime: null }, { merge: true });
                showNotification('success', 'Round timer disabled.');
                return;
            }
            const dateObj = new Date(roundEndTimeStr);
            await setDoc(doc(firestore, 'game_config', 'spoon_assassins'), { roundEndTime: dateObj.toISOString() }, { merge: true });
            showNotification('success', 'Round clock updated successfully!');
        } catch (error) {
            console.error('Error saving round time:', error);
            showNotification('error', 'Failed to set round clock.');
        }
    };

    const handleResetGame = async () => {
        if (!window.confirm('WARNING: This will PERMANENTLY DELETE all targets and assassination attempts. This action cannot be undone. Are you sure you want to reset the game?')) {
            return;
        }

        setLoading(true);
        try {
            // 1. Delete all targets
            const targetsSnapshot = await getDocs(collection(firestore, 'targets'));
            const deleteTargetsPromises = targetsSnapshot.docs.map(doc => deleteDoc(doc.ref));

            // 2. Delete all attempts
            const attemptsSnapshot = await getDocs(collection(firestore, 'assassination_attempts'));
            const deleteAttemptsPromises = attemptsSnapshot.docs.map(doc => deleteDoc(doc.ref));

            await Promise.all([...deleteTargetsPromises, ...deleteAttemptsPromises]);

            // 3. Reset local state
            setAssignments([]);
            setEliminatedUsers([]);
            setPendingIntel([]);
            setChain([{ userId: '', targetId: '' }]);

            showNotification('success', 'Game has been reset successfully.');
        } catch (error) {
            console.error('Error resetting game:', error);
            showNotification('error', 'Failed to reset game.');
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Data ---

    const activeCount = assignments.length - eliminatedUsers.length;
    const neutralizedCount = eliminatedUsers.length;

    // Ordered Chain for display
    const getOrderedChain = () => {
        if (assignments.length === 0) return [];
        const map = new Map();
        assignments.forEach(a => map.set(a.userId, a));

        let start = assignments[0].userId;
        // Try to find someone who is targeting the start (to close the loop conceptually) or just pick first
        // Simple traversal
        const ordered = [];
        let current = start;
        const visited = new Set();

        while (map.has(current) && !visited.has(current)) {
            visited.add(current);
            const entry = map.get(current);
            ordered.push(entry);
            current = entry.targetId;
        }

        // Add any disconnected islands if chain was broken manually
        assignments.forEach(a => {
            if (!visited.has(a.userId)) ordered.push(a);
        });

        return ordered;
    };

    const handleOpenBuilder = () => {
        if (assignments.length > 0) {
            const ordered = getOrderedChain();
            const newChain = ordered.map(a => ({
                userId: a.userId,
                targetId: a.targetId
            }));
            setChain(newChain);
        } else {
            setChain([{ userId: '', targetId: '' }]);
        }
        setViewMode('builder');
    };

    const filteredChain = getOrderedChain().filter(a =>
        (a.firstName + ' ' + a.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.targetName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-sans text-text-main antialiased">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-24 right-10 z-[60] px-6 py-4 rounded shadow-lg border-l-4 ${notification.type === 'success' ? 'bg-white border-green-500 text-green-800' : 'bg-white border-red-500 text-red-800'
                    } transition-all duration-300 animate-fade-in-down`}>
                    <p className="font-bold text-sm">{notification.message}</p>
                </div>
            )}



            <main className="flex-1 px-10 py-12 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-8">
                {/* Stats Row */}
                <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                    <div className="flex flex-col gap-1 border-l-2 border-primary-burgundy pl-6 py-2">
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Active Operatives</p>
                        <p className="text-text-main text-3xl font-display font-bold">{activeCount} <span className="text-sm font-normal text-text-muted">/ {assignments.length}</span></p>
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-primary-burgundy pl-6 py-2">
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Targets Locked</p>
                        <p className="text-text-main text-3xl font-display font-bold italic">{assignments.length > 0 ? '100%' : '0%'}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-brand-gold pl-6 py-2">
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Pending Intel</p>
                        <p className="text-primary-burgundy text-3xl font-display font-bold underline underline-offset-4 decoration-brand-gold">{pendingIntel.length}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-l-2 border-border-light pl-6 py-2">
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Neutralized</p>
                        <p className="text-text-main text-3xl font-display font-bold">{neutralizedCount}</p>
                    </div>
                </div>

                {/* Left Column */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-white border border-border-light overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-border-light flex flex-col sm:flex-row justify-between items-baseline gap-4">
                            <div>
                                <h2 className="text-primary-burgundy text-2xl font-display font-bold italic">
                                    {viewMode === 'manifest' ? 'Player Manifest' : 'Target Builder'}
                                </h2>
                                <div className="h-1 w-12 bg-brand-gold mt-2"></div>
                            </div>
                            {viewMode === 'manifest' && (
                                <div className="relative w-full sm:w-72">
                                    <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-text-muted text-sm">search</span>
                                    <input
                                        className="w-full bg-transparent border-b border-border-light focus:border-primary-burgundy pl-8 py-2 text-sm text-text-main placeholder:text-text-muted outline-none transition-all rounded-none"
                                        placeholder="Search members..."
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            {viewMode === 'manifest' ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border-light bg-gray-50/50">
                                            <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">Operative</th>
                                            <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">Status</th>
                                            <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">Current Target</th>
                                            <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light">
                                        {filteredChain.map((assignment) => {
                                            const isEliminated = eliminatedUsers.includes(assignment.userId);
                                            const user = getUserById(assignment.userId);
                                            return (
                                                <tr key={assignment.userId} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className={`flex items-center gap-4 ${isEliminated ? 'opacity-50' : ''}`}>
                                                            <div className="w-10 h-10 border border-border-light flex items-center justify-center text-xs font-bold text-primary-burgundy bg-white shadow-sm italic overflow-hidden rounded-full">
                                                                {user?.profilePictureUrl ? (
                                                                    <img src={user.profilePictureUrl} alt={`${assignment.firstName} ${assignment.lastName}`} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <>{assignment.firstName?.charAt(0)}{assignment.lastName?.charAt(0)}</>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${isEliminated ? 'text-text-muted line-through' : 'text-text-main group-hover:text-primary-burgundy'} transition-colors`}>
                                                                    {assignment.firstName} {assignment.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-text-muted tracking-wider">#{assignment.userId.slice(-6)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`inline-flex items-center gap-2 px-0 py-1 text-[10px] font-bold uppercase ${isEliminated ? 'text-text-muted' : 'text-primary-burgundy border-b-2 border-brand-gold'}`}>
                                                            {isEliminated ? 'ELIMINATED' : 'ACTIVE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <p className={`text-sm font-medium italic ${isEliminated ? 'text-text-muted' : 'text-text-main'}`}>
                                                            {isEliminated ? 'NONE' : assignment.targetName}
                                                        </p>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button
                                                            onClick={() => toggleEliminationStatus(assignment.userId)}
                                                            className="text-text-muted hover:text-primary-burgundy transition-colors"
                                                            title={isEliminated ? "Revive" : "Eliminate"}
                                                        >
                                                            <span className="material-symbols-outlined">more_horiz</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredChain.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-8 py-10 text-center text-text-muted text-sm italic">
                                                    No operatives found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 bg-gray-50/30">
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-sm text-text-muted">Build the target chain. Each player targets the next.</p>
                                        <button
                                            onClick={randomizeChain}
                                            className="text-xs font-bold text-primary-burgundy uppercase tracking-[0.15em] border border-primary-burgundy px-4 py-2 hover:bg-primary-burgundy hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">shuffle</span> Randomize Order
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {chain.map((item, index) => (
                                            <div 
                                                key={index} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="flex items-center gap-4 bg-white p-4 border border-border-light shadow-sm hover:border-primary-burgundy hover:shadow-md transition-all cursor-move group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary-burgundy text-sm">drag_indicator</span>
                                                    <span className="text-xs font-bold text-primary-burgundy w-6">#{index + 1}</span>
                                                </div>
                                                <select
                                                    className="flex-1 bg-transparent border-b border-border-light focus:border-primary-burgundy py-2 text-sm outline-none cursor-pointer"
                                                    value={item.userId}
                                                    onChange={(e) => updatePlayerInChain(index, e.target.value)}
                                                >
                                                    <option value="">Select Operative</option>
                                                    {users
                                                        .filter(user =>
                                                            // Keep user if already selected in this slot OR not selected elsewhere
                                                            user.id === item.userId ||
                                                            !chain.some(c => c.userId === user.id)
                                                        )
                                                        .map(user => (
                                                            <option key={user.id} value={user.id}>
                                                                {formatUserName(user)}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <div className="flex gap-2">
                                                    {index > 0 && (
                                                        <button onClick={() => removePlayerFromChain(index)} className="text-text-muted hover:text-primary-burgundy">
                                                            <span className="material-symbols-outlined">remove</span>
                                                        </button>
                                                    )}
                                                    {index === chain.length - 1 && (
                                                        <button onClick={addPlayerToChain} className="text-text-muted hover:text-primary-burgundy">
                                                            <span className="material-symbols-outlined">add</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={saveAssignments}
                                            className="bg-primary-burgundy text-white px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#6b1212] disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">save</span> Save Chain
                                        </button>
                                        <button
                                            onClick={() => setViewMode('manifest')}
                                            className="border border-border-light text-text-muted px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode === 'manifest' && (
                            <div className="p-6 border-t border-border-light flex justify-center bg-gray-50/50">
                                <button className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] hover:text-primary-burgundy transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">download</span> Download Roster (CSV)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Command */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                    <div className="bg-white border border-border-light p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <h3 className="font-display font-bold text-xl uppercase italic text-primary-burgundy">Command</h3>
                            <div className="flex-1 h-[1px] bg-border-light"></div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-sm font-bold text-text-main mb-2 tracking-tight">Target Management</p>
                                <p className="text-xs text-text-muted mb-6 leading-relaxed">
                                    {viewMode === 'manifest'
                                        ? "Redistribute target pool among all active players. New chains will be generated and distributed immediately."
                                        : "Currently building a new target chain."}
                                </p>
                                {viewMode === 'manifest' ? (
                                    <button
                                        onClick={handleOpenBuilder}
                                        className="w-full bg-brand-gold text-black py-4 font-bold text-xs uppercase tracking-[0.2em] hover:brightness-105 active:scale-[0.98] transition-all shadow-md"
                                    >
                                        EDIT & ASSIGN TARGETS
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setViewMode('manifest')}
                                        className="w-full border border-border-light text-text-muted py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all"
                                    >
                                        CANCEL OPERATION
                                    </button>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-bold text-text-main mb-2 tracking-tight">Round Clock</p>
                                <p className="text-[10px] text-text-muted mb-4 uppercase tracking-widest leading-relaxed">
                                    Set the deadline for the current round (PST).
                                </p>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="datetime-local"
                                        value={roundEndTimeStr}
                                        onChange={(e) => setRoundEndTimeStr(e.target.value)}
                                        className="w-full border border-border-light bg-gray-50/50 px-4 py-3 text-sm outline-none focus:border-brand-gold transition-all font-mono"
                                    />
                                    <button
                                        onClick={handleSaveRoundTime}
                                        className="w-full border border-border-light bg-white text-text-main py-4 font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        Update Round Clock
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex flex-col items-center justify-center p-4 border border-border-light hover:border-primary-burgundy transition-all group">
                                    <span className="material-symbols-outlined text-text-muted group-hover:text-primary-burgundy transition-colors mb-2">campaign</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-text-main">Mass Alert</span>
                                </button>
                                <button
                                    onClick={handleResetGame}
                                    className="flex flex-col items-center justify-center p-4 border border-border-light hover:border-red-600 transition-all group"
                                >
                                    <span className="material-symbols-outlined text-text-muted group-hover:text-red-600 transition-colors mb-2">refresh</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-red-600">Reset Game</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-border-light flex flex-col">
                        <div className="p-6 border-b border-border-light flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-primary-burgundy text-sm font-bold uppercase tracking-[0.15em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">verified_user</span>
                                Pending Intel
                            </h2>
                            <span className="bg-brand-gold text-black text-[9px] font-bold px-2 py-0.5 tracking-tighter">{pendingIntel.length} NEW</span>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
                            {pendingIntel.length === 0 ? (
                                <p className="text-xs text-text-muted italic text-center py-4">No pending reports.</p>
                            ) : (
                                pendingIntel.map(attempt => (
                                    <div key={attempt.id} className="flex flex-col gap-4 border-b border-border-light pb-6 group last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 border border-border-light bg-white text-primary-burgundy flex items-center justify-center text-[10px] font-bold italic overflow-hidden rounded-full">
                                                    {(() => {
                                                        const killerUser = attempt.killerId ? getUserById(attempt.killerId) : users.find(u => (u.firstName + ' ' + u.lastName) === attempt.killerName);
                                                        return killerUser?.profilePictureUrl ? (
                                                            <img src={killerUser.profilePictureUrl} alt={attempt.killerName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            attempt.killerName?.split(' ').map(n => n[0]).join('')
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-text-main uppercase">
                                                        {attempt.killerName} <span className="text-primary-burgundy">→</span> {attempt.targetName}
                                                    </p>
                                                    <p className="text-[9px] text-text-muted uppercase tracking-widest">
                                                        {attempt.timestamp?.toDate ? attempt.timestamp.toDate().toLocaleString() : 'Just now'} // {attempt.location || 'Unknown Location'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-sm text-text-muted">more_vert</span>
                                        </div>
                                        {attempt.proofUrl && (
                                            <div className="aspect-video w-full bg-gray-100 relative overflow-hidden group">
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700"
                                                    style={{ backgroundImage: `url('${attempt.proofUrl}')` }}
                                                ></div>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleIntelDecision(attempt, true)}
                                                className="flex-1 border border-primary-burgundy text-primary-burgundy py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary-burgundy hover:text-white transition-all"
                                            >
                                                APPROVE
                                            </button>
                                            <button
                                                onClick={() => handleIntelDecision(attempt, false)}
                                                className="flex-1 border border-border-light text-text-muted py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                                            >
                                                REJECT
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-border-light text-center">
                            <button className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] hover:text-primary-burgundy transition-all">View All Reports</button>
                        </div>
                    </div>
                </div>
            </main>


        </div>
    );
};

export default SpoonAssassins;
