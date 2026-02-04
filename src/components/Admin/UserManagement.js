import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, storage } from '../../firebase';
import './Admin.css';
import { checkUserRole } from './auth';
import { useNavigate } from 'react-router-dom';

// Constants
const AVAILABLE_ROLES = [
    "Regent", "Vice Regent", "Treasurer", "Scribe", "Corresponding Secretary",
    "Brotherhood Chair", "Service Chair", "Professional Development Chair",
    "Recruitment Chair", "Special Events Chair", "Engineering Outreach Chair",
    "Academic Chair", "Fundraising Chair", "Marshall", "Social Media Chair",
    "Webmaster", "PNME Chair", "Historian", "Mediation Chair", "DEI Chair"
];

const AVAILABLE_FAMILIES = [
    "Filthy Fam", "Presibobante Guys", "Engh Gang", "Clout Fam"
];

// Utility functions
const validateLinkedInUrl = (url) => {
    if (!url) return true;
    return url.startsWith('https://www.linkedin.com/in/');
};

const uploadProfilePicture = async (file) => {
    if (!file) return null;
    const path = `profilePictures/${new Date().getTime()}_${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

// Reusable form components
const ProfilePictureInput = ({ onChange, label }) => (
    <div className="admin-input-group">
        <label>{label}</label>
        <input type="file" onChange={(e) => onChange(e.target.files[0])} />
    </div>
);

const TextInput = ({ label, value, onChange, placeholder }) => (
    <div className="admin-input-group">
        <label>{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

const SelectInput = ({ label, value, onChange, options, placeholder }) => (
    <div className="admin-input-group">
        <label>{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{placeholder}</option>
            {options.map((option, index) => (
                <option key={index} value={option}>{option}</option>
            ))}
        </select>
    </div>
);

const ADMIN_ROLES = [
    'Webmaster', 'Regent', 'Vice Regent', 'Treasurer', 'Scribe',
    'Brotherhood Chair', 'Mediation Chair', 'Historian'
];

const UserManagement = () => {
    // State management
    const [users, setUsers] = useState([]);
    const [alumni, setAlumni] = useState([]);
    const [availableBigs, setAvailableBigs] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [editingAlumni, setEditingAlumni] = useState(null);
    const [profilePictureEdit, setProfilePictureEdit] = useState(null);
    const [alumniProfilePictureEdit, setAlumniProfilePictureEdit] = useState(null);

    // Form state
    const [newUser, setNewUser] = useState({
        email: '', firstName: '', lastName: '', class: '',
        graduationYear: '', family: '', major: '', role: '',
        points: 0, profilePictureUrl: '', bigId: '', linkedinUrl: ''
    });

    const [newAlumni, setNewAlumni] = useState({
        firstName: '', lastName: '', graduationYear: '', major: '',
        profilePictureUrl: '', bigId: '', dropped: false,
        family: '', linkedinUrl: ''
    });

    // Data fetching
    const fetchUsers = async () => {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        return usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const fetchAlumni = async () => {
        const alumniSnapshot = await getDocs(collection(firestore, 'alumni'));
        return alumniSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    };

    const fetchAvailableBigs = async () => {
        const [usersSnapshot, alumniSnapshot] = await Promise.all([
            getDocs(collection(firestore, 'users')),
            getDocs(collection(firestore, 'alumni'))
        ]);

        const usersData = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAlumni: false
        }));

        const alumniData = alumniSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAlumni: true
        }));

        setAvailableBigs([...usersData, ...alumniData]);
    };

    // CRUD operations
    const addUser = async (userData, profilePicture, forcedId = null) => {
        if (!validateLinkedInUrl(userData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) userData.profilePictureUrl = profilePictureUrl;

        let userId = forcedId;
        if (forcedId) {
            await setDoc(doc(firestore, 'users', forcedId), userData);
        } else {
            const docRef = await addDoc(collection(firestore, 'users'), userData);
            userId = docRef.id;
        }

        // Sync admin role to 'admins' collection for security rules
        if (ADMIN_ROLES.includes(userData.role)) {
            await setDoc(doc(firestore, 'admins', userData.email), {
                role: userData.role,
                userId: userId
            });
        }

        const updatedUsers = await fetchUsers();
        setUsers(updatedUsers);
    };

    const updateUser = async (userData, profilePicture) => {
        if (!validateLinkedInUrl(userData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) userData.profilePictureUrl = profilePictureUrl;

        const userRef = doc(firestore, 'users', userData.id);
        await updateDoc(userRef, userData);

        // Sync admin role to 'admins' collection for security rules
        if (ADMIN_ROLES.includes(userData.role)) {
            await setDoc(doc(firestore, 'admins', userData.email), {
                role: userData.role,
                userId: userData.id
            });
        } else {
            // If they no longer have an admin role, remove from 'admins' collection
            try {
                await deleteDoc(doc(firestore, 'admins', userData.email));
            } catch (err) {
                // Ignore if it doesn't exist
            }
        }

        const updatedUsers = await fetchUsers();
        setUsers(updatedUsers);
    };

    const addAlumni = async (alumniData, profilePicture, forcedId = null) => {
        if (!validateLinkedInUrl(alumniData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) alumniData.profilePictureUrl = profilePictureUrl;

        if (forcedId) {
            await setDoc(doc(firestore, 'alumni', forcedId), alumniData);
        } else {
            await addDoc(collection(firestore, 'alumni'), alumniData);
        }

        const updatedAlumni = await fetchAlumni();
        setAlumni(updatedAlumni);
    };

    const updateAlumni = async (alumniData, profilePicture) => {
        if (!validateLinkedInUrl(alumniData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) alumniData.profilePictureUrl = profilePictureUrl;

        const alumniRef = doc(firestore, 'alumni', alumniData.id);
        await updateDoc(alumniRef, alumniData);
        const updatedAlumni = await fetchAlumni();
        setAlumni(updatedAlumni);
    };

    const convertToAlumni = async (userData) => {
        const confirmed = window.confirm(
            `Are you sure you want to convert ${userData.firstName} ${userData.lastName} to alumni? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            const alumniData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                graduationYear: userData.graduationYear,
                major: userData.major,
                profilePictureUrl: userData.profilePictureUrl,
                bigId: userData.bigId,
                dropped: false,
                family: userData.family,
                linkedinUrl: userData.linkedinUrl || ''
            };

            await addAlumni(alumniData, null, userData.id);
            await deleteDoc(doc(firestore, 'users', userData.id));

            const [updatedUsers, updatedAlumni] = await Promise.all([
                fetchUsers(),
                fetchAlumni()
            ]);

            setUsers(updatedUsers);
            setAlumni(updatedAlumni);
            setEditingUser(null);
        } catch (error) {
            console.error('Error converting user to alumni:', error);
            alert('Error converting user to alumni');
        }
    };

    const convertToUser = async (alumniData) => {
        const confirmed = window.confirm(
            `Are you sure you want to convert ${alumniData.firstName} ${alumniData.lastName} back to an active user?`
        );

        if (!confirmed) return;

        try {
            const userData = {
                email: '', // Alumni don't have emails in this schema, so we'll leave it blank or prompt for it.
                firstName: alumniData.firstName,
                lastName: alumniData.lastName,
                class: '', // Alumni don't have class in this schema, so we'll leave it blank or prompt for it.
                graduationYear: alumniData.graduationYear,
                family: alumniData.family,
                major: alumniData.major,
                role: '', // Alumni don't have roles, so we'll leave it blank or prompt for it.
                points: 0, // Alumni don't have points, so we'll set to 0 or prompt for it.
                profilePictureUrl: alumniData.profilePictureUrl,
                bigId: alumniData.bigId,
                linkedinUrl: alumniData.linkedinUrl || ''
            };

            await addUser(userData, null, alumniData.id);
            await deleteDoc(doc(firestore, 'alumni', alumniData.id));

            const [updatedUsers, updatedAlumni] = await Promise.all([
                fetchUsers(),
                fetchAlumni()
            ]);

            setUsers(updatedUsers);
            setAlumni(updatedAlumni);
            setEditingAlumni(null);
        } catch (error) {
            console.error('Error converting alumni to user:', error);
            alert('Error converting alumni to user');
        }
    };

    // Event handlers
    const handleAddUser = async () => {
        try {
            await addUser(newUser, profilePictureEdit);
            setNewUser({
                email: '', firstName: '', lastName: '', class: '',
                graduationYear: '', family: '', major: '', role: '',
                points: 0, profilePictureUrl: '', bigId: '', linkedinUrl: ''
            });
            setProfilePictureEdit(null);
            alert('User added successfully');
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Error adding user');
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await updateUser(editingUser, profilePictureEdit);
            setEditingUser(null);
            setProfilePictureEdit(null);
            alert('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error updating user');
        }
    };

    const handleAddAlumni = async () => {
        try {
            await addAlumni(newAlumni, alumniProfilePictureEdit);
            setNewAlumni({
                firstName: '', lastName: '', graduationYear: '', major: '',
                profilePictureUrl: '', bigId: '', dropped: false,
                family: '', linkedinUrl: ''
            });
            setAlumniProfilePictureEdit(null);
            alert('Alumni added successfully');
        } catch (error) {
            console.error('Error adding alumni:', error);
            alert('Error adding alumni');
        }
    };

    const handleUpdateAlumni = async () => {
        if (!editingAlumni) return;
        try {
            await updateAlumni(editingAlumni, alumniProfilePictureEdit);
            setEditingAlumni(null);
            setAlumniProfilePictureEdit(null);
            alert('Alumni updated successfully');
        } catch (error) {
            console.error('Error updating alumni:', error);
            alert('Error updating alumni');
        }
    };

    const handleSyncMailchimp = async () => {
        if (!window.confirm('Are you sure you want to sync all user points to Mailchimp? This may take a few moments.')) return;

        try {
            const response = await fetch('/api/sync-mailchimp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();

            if (response.ok) {
                alert(`Sync Complete!\n\nSuccessful Updates: ${data.stats?.successful_updates || 0}\nFailed Updates: ${data.stats?.failed_updates || 0}`);
            } else {
                console.error('Sync failed response:', data);
                alert(`Sync Failed: ${data.error || 'Unknown error'}\n${data.details || ''}`);
            }
        } catch (error) {
            console.error('Error syncing Mailchimp:', error);
            alert('Error syncing Mailchimp. Check console for details.');
        }
    };

    // Initialize data
    useEffect(() => {
        const fetchAllData = async () => {
            const [usersList, alumniList] = await Promise.all([
                fetchUsers(),
                fetchAlumni()
            ]);
            setUsers(usersList);
            setAlumni(alumniList);
        };
        fetchAllData();
        fetchAvailableBigs();
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        // Check user permissions on component mount
        const unsubscribe = checkUserRole(navigate, 'user-management');

        // Cleanup subscription to onAuthStateChanged when component unmounts
        return () => unsubscribe && unsubscribe();
    }, [navigate]);

    return (
        <div className="admin-page">
            <h1>User Management</h1>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    className="add"
                    onClick={handleSyncMailchimp}
                    style={{ backgroundColor: '#FFE01B', color: '#000', fontWeight: 'bold' }}
                >
                    Sync Mailchimp Points
                </button>
            </div>

            {/* Add user section */}
            <div className="admin-add-user">
                <h2>Add New User</h2>
                <ProfilePictureInput
                    onChange={setProfilePictureEdit}
                    label="Profile Picture"
                />
                <TextInput
                    label="Email"
                    value={newUser.email}
                    onChange={(value) => setNewUser({ ...newUser, email: value })}
                    placeholder="Email"
                />
                <TextInput
                    label="First Name"
                    value={newUser.firstName}
                    onChange={(value) => setNewUser({ ...newUser, firstName: value })}
                    placeholder="First Name"
                />
                <TextInput
                    label="Last Name"
                    value={newUser.lastName}
                    onChange={(value) => setNewUser({ ...newUser, lastName: value })}
                    placeholder="Last Name"
                />
                <TextInput
                    label="Class"
                    value={newUser.class}
                    onChange={(value) => setNewUser({ ...newUser, class: value })}
                    placeholder="Class"
                />
                <TextInput
                    label="Graduation Year"
                    value={newUser.graduationYear}
                    onChange={(value) => setNewUser({ ...newUser, graduationYear: value })}
                    placeholder="Graduation Year"
                />
                <SelectInput
                    label="Family"
                    value={newUser.family}
                    onChange={(value) => setNewUser({ ...newUser, family: value })}
                    options={AVAILABLE_FAMILIES}
                    placeholder="Select a Family"
                />
                <TextInput
                    label="Major"
                    value={newUser.major}
                    onChange={(value) => setNewUser({ ...newUser, major: value })}
                    placeholder="Major"
                />
                <SelectInput
                    label="Role"
                    value={newUser.role}
                    onChange={(value) => setNewUser({ ...newUser, role: value })}
                    options={AVAILABLE_ROLES}
                    placeholder="No Role"
                />
                <div className="admin-input-group">
                    <label>Points</label>
                    <input
                        type="number"
                        value={newUser.points}
                        onChange={(e) => setNewUser({ ...newUser, points: parseInt(e.target.value, 10) })}
                        placeholder="Points"
                    />
                </div>
                <TextInput
                    label="LinkedIn URL"
                    value={newUser.linkedinUrl}
                    onChange={(value) => setNewUser({ ...newUser, linkedinUrl: value })}
                    placeholder="https://www.linkedin.com/in/username"
                />
                <div className="admin-buttons">
                    <button className="add" onClick={handleAddUser}>
                        Add User
                    </button>
                </div>
            </div>

            {/* Display all users */}
            <h2>Registered Users</h2>
            <div className="admin-user-cards">
                {users.map((user) => (
                    <div key={user.id} className="user-card" onClick={() => setEditingUser(user)}>
                        <div className="user-card-info">
                            {user.profilePictureUrl && (
                                <img
                                    src={user.profilePictureUrl}
                                    alt={`${user.firstName} ${user.lastName}`}
                                    className="user-card-img-small"
                                />
                            )}
                            <div className="user-card-text">
                                <span className="user-card-name">
                                    {user.firstName} {user.lastName}
                                </span>
                                <br />
                                <span className="user-card-role">{user.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit user modal */}
            {editingUser && (
                <>
                    <div className="admin-edit-user-overlay" onClick={() => setEditingUser(null)}></div>
                    <div className="admin-edit-user">
                        <h2>Edit User</h2>
                        <ProfilePictureInput
                            onChange={setProfilePictureEdit}
                            label="Profile Picture"
                        />
                        <TextInput
                            label="Email"
                            value={editingUser.email}
                            onChange={(value) => setEditingUser({ ...editingUser, email: value })}
                            placeholder="Email"
                        />
                        <TextInput
                            label="First Name"
                            value={editingUser.firstName}
                            onChange={(value) => setEditingUser({ ...editingUser, firstName: value })}
                            placeholder="First Name"
                        />
                        <TextInput
                            label="Last Name"
                            value={editingUser.lastName}
                            onChange={(value) => setEditingUser({ ...editingUser, lastName: value })}
                            placeholder="Last Name"
                        />
                        <TextInput
                            label="Class"
                            value={editingUser.class}
                            onChange={(value) => setEditingUser({ ...editingUser, class: value })}
                            placeholder="Class"
                        />
                        <TextInput
                            label="Graduation Year"
                            value={editingUser.graduationYear}
                            onChange={(value) => setEditingUser({ ...editingUser, graduationYear: value })}
                            placeholder="Graduation Year"
                        />
                        <SelectInput
                            label="Family"
                            value={editingUser.family}
                            onChange={(value) => setEditingUser({ ...editingUser, family: value })}
                            options={AVAILABLE_FAMILIES}
                            placeholder="Select a Family"
                        />
                        <TextInput
                            label="Major"
                            value={editingUser.major}
                            onChange={(value) => setEditingUser({ ...editingUser, major: value })}
                            placeholder="Major"
                        />
                        <div className="admin-input-group">
                            <label>Big Brother:</label>
                            <select
                                value={editingUser.bigId || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, bigId: e.target.value })}
                                className="admin-select"
                            >
                                <option value="">Select a Big Brother</option>
                                {availableBigs
                                    .filter(member => member.id !== editingUser.id)
                                    .map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.firstName} {member.lastName}
                                            {member.isAlumni ? ' (Alumni)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <SelectInput
                            label="Role"
                            value={editingUser.role}
                            onChange={(value) => setEditingUser({ ...editingUser, role: value })}
                            options={AVAILABLE_ROLES}
                            placeholder="No Role"
                        />
                        <div className="admin-input-group">
                            <label>Points</label>
                            <input
                                type="number"
                                value={editingUser.points}
                                onChange={(e) => setEditingUser({ ...editingUser, points: parseInt(e.target.value, 10) })}
                                placeholder="Points"
                            />
                        </div>
                        <TextInput
                            label="LinkedIn URL"
                            value={editingUser.linkedinUrl || ''}
                            onChange={(value) => setEditingUser({ ...editingUser, linkedinUrl: value })}
                            placeholder="https://www.linkedin.com/in/username"
                        />
                        <div className="admin-buttons">
                            <button className="close" onClick={() => setEditingUser(null)}>
                                Close
                            </button>
                            <button className="convert" onClick={() => convertToAlumni(editingUser)}>
                                Convert to Alumni
                            </button>
                            <button className="update" onClick={handleUpdateUser}>
                                Update User
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Add alumni section */}
            <div className="admin-add-user">
                <h2>Add New Alumni</h2>
                <ProfilePictureInput
                    onChange={setAlumniProfilePictureEdit}
                    label="Profile Picture"
                />
                <TextInput
                    label="First Name"
                    value={newAlumni.firstName}
                    onChange={(value) => setNewAlumni({ ...newAlumni, firstName: value })}
                    placeholder="First Name"
                />
                <TextInput
                    label="Last Name"
                    value={newAlumni.lastName}
                    onChange={(value) => setNewAlumni({ ...newAlumni, lastName: value })}
                    placeholder="Last Name"
                />
                <TextInput
                    label="Graduation Year"
                    value={newAlumni.graduationYear}
                    onChange={(value) => setNewAlumni({ ...newAlumni, graduationYear: value })}
                    placeholder="Graduation Year"
                />
                <TextInput
                    label="Major"
                    value={newAlumni.major}
                    onChange={(value) => setNewAlumni({ ...newAlumni, major: value })}
                    placeholder="Major"
                />
                <SelectInput
                    label="Family"
                    value={newAlumni.family}
                    onChange={(value) => setNewAlumni({ ...newAlumni, family: value })}
                    options={AVAILABLE_FAMILIES}
                    placeholder="Select a Family"
                />
                <div className="admin-input-group">
                    <label>Dropped</label>
                    <input
                        type="checkbox"
                        checked={newAlumni.dropped}
                        onChange={(e) => setNewAlumni({ ...newAlumni, dropped: e.target.checked })}
                    />
                </div>
                <div className="admin-input-group">
                    <label>Big Brother:</label>
                    <select
                        value={newAlumni.bigId || ''}
                        onChange={(e) => setNewAlumni({ ...newAlumni, bigId: e.target.value })}
                        className="admin-select"
                    >
                        <option value="">Select a Big Brother</option>
                        {availableBigs.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                                {member.isAlumni ? ' (Alumni)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <TextInput
                    label="LinkedIn URL"
                    value={newAlumni.linkedinUrl || ''}
                    onChange={(value) => setNewAlumni({ ...newAlumni, linkedinUrl: value })}
                    placeholder="https://www.linkedin.com/in/username"
                />
                <div className="admin-buttons">
                    <button className="add" onClick={handleAddAlumni}>
                        Add Alumni
                    </button>
                </div>
            </div>

            {/* Display all alumni */}
            <h2>Alumni</h2>
            <div className="admin-user-cards">
                {alumni.map((alum) => (
                    <div key={alum.id} className="user-card" onClick={() => setEditingAlumni(alum)}>
                        <div className="user-card-info">
                            {alum.profilePictureUrl && (
                                <img
                                    src={alum.profilePictureUrl}
                                    alt={`${alum.firstName} ${alum.lastName}`}
                                    className="user-card-img-small"
                                />
                            )}
                            <div className="user-card-text">
                                <span className="user-card-name">
                                    {alum.firstName} {alum.lastName}
                                </span>
                                <br />
                                <span className="user-card-role">{alum.graduationYear}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit alumni modal */}
            {editingAlumni && (
                <>
                    <div className="admin-edit-user-overlay" onClick={() => setEditingAlumni(null)}></div>
                    <div className="admin-edit-user">
                        <h2>Edit Alumni</h2>
                        <ProfilePictureInput
                            onChange={setAlumniProfilePictureEdit}
                            label="Profile Picture"
                        />
                        <TextInput
                            label="First Name"
                            value={editingAlumni.firstName}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, firstName: value })}
                            placeholder="First Name"
                        />
                        <TextInput
                            label="Last Name"
                            value={editingAlumni.lastName}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, lastName: value })}
                            placeholder="Last Name"
                        />
                        <TextInput
                            label="Graduation Year"
                            value={editingAlumni.graduationYear}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, graduationYear: value })}
                            placeholder="Graduation Year"
                        />
                        <TextInput
                            label="Major"
                            value={editingAlumni.major}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, major: value })}
                            placeholder="Major"
                        />
                        <SelectInput
                            label="Family"
                            value={editingAlumni.family}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, family: value })}
                            options={AVAILABLE_FAMILIES}
                            placeholder="Select a Family"
                        />
                        <div className="admin-input-group">
                            <label>Dropped</label>
                            <input
                                type="checkbox"
                                checked={editingAlumni.dropped}
                                onChange={(e) => setEditingAlumni({ ...editingAlumni, dropped: e.target.checked })}
                            />
                        </div>
                        <div className="admin-input-group">
                            <label>Big Brother:</label>
                            <select
                                value={editingAlumni.bigId || ''}
                                onChange={(e) => setEditingAlumni({ ...editingAlumni, bigId: e.target.value })}
                                className="admin-select"
                            >
                                <option value="">Select a Big Brother</option>
                                {availableBigs
                                    .filter(member => member.id !== editingAlumni.id)
                                    .map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.firstName} {member.lastName}
                                            {member.isAlumni ? ' (Alumni)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <TextInput
                            label="LinkedIn URL"
                            value={editingAlumni.linkedinUrl || ''}
                            onChange={(value) => setEditingAlumni({ ...editingAlumni, linkedinUrl: value })}
                            placeholder="https://www.linkedin.com/in/username"
                        />
                        <div className="admin-buttons">
                            <button className="close" onClick={() => setEditingAlumni(null)}>
                                Close
                            </button>
                            <button className="update" onClick={handleUpdateAlumni}>
                                Update Alumni
                            </button>
                            <button className="convert" onClick={() => convertToUser(editingAlumni)}>
                                Convert to User
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserManagement;