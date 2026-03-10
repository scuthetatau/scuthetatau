import React, { useEffect, useState, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, storage } from '../../firebase';
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

const PLEDGE_CLASSES = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];

const ADMIN_ROLES = [
    'Webmaster', 'Regent', 'Vice Regent', 'Treasurer', 'Scribe',
    'Brotherhood Chair', 'Mediation Chair', 'Historian'
];

// Utility functions
const validateLinkedInUrl = (url) => {
    if (!url) return true;
    return url.startsWith('https://www.linkedin.com/in/') || url.startsWith('linkedin.com/in/');
};

const uploadProfilePicture = async (file) => {
    if (!file) return null;
    const path = `profilePictures/${new Date().getTime()}_${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
};

const UserManagement = () => {
    const navigate = useNavigate();

    // Data State
    const [users, setUsers] = useState([]);
    const [alumni, setAlumni] = useState([]);
    const [availableBigs, setAvailableBigs] = useState([]);

    // UI State
    const [isAddActiveOpen, setIsAddActiveOpen] = useState(false);
    const [isAddAlumniOpen, setIsAddAlumniOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingAlumni, setEditingAlumni] = useState(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [majorFilter, setMajorFilter] = useState('All Majors');

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

        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isAlumni: false }));
        const alumniData = alumniSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isAlumni: true }));
        setAvailableBigs([...usersData, ...alumniData]);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            const [usersList, alumniList] = await Promise.all([fetchUsers(), fetchAlumni()]);
            setUsers(usersList);
            setAlumni(alumniList);
        };
        fetchAllData();
        fetchAvailableBigs();
    }, []);

    useEffect(() => {
        const unsubscribe = checkUserRole(navigate, 'user-management');
        return () => unsubscribe && unsubscribe();
    }, [navigate]);

    // Combiner for table
    const allMembers = useMemo(() => {
        const combined = [
            ...users.map(u => ({ ...u, type: u.dropped ? 'Dropped' : 'Active', originalType: 'Active' })),
            ...alumni.map(a => ({ ...a, type: a.dropped ? 'Dropped' : 'Alumni', originalType: 'Alumni' }))
        ];

        return combined.filter(member => {
            const matchSearch = (member.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (member.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (member.major?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (member.class?.toLowerCase() || '').includes(searchQuery.toLowerCase());

            const matchStatus = statusFilter === 'All Statuses' || member.type === statusFilter;
            const matchMajor = majorFilter === 'All Majors' || member.major === majorFilter;

            return matchSearch && matchStatus && matchMajor;
        });
    }, [users, alumni, searchQuery, statusFilter, majorFilter]);

    // Derived unique majors for filter
    const uniqueMajors = useMemo(() => {
        const majors = new Set([...users, ...alumni].map(m => m.major).filter(Boolean));
        return ['All Majors', ...Array.from(majors).sort()];
    }, [users, alumni]);

    const activeCount = users.filter(u => !u.dropped).length;
    const alumniCount = alumni.length;

    // Handlers
    const handleSaveActive = async (userData, profilePicture, forcedId = null) => {
        if (!validateLinkedInUrl(userData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/ or linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) userData.profilePictureUrl = profilePictureUrl;

        delete userData.type;
        delete userData.originalType;

        let userId = forcedId;
        if (forcedId) {
            await setDoc(doc(firestore, 'users', forcedId), userData);
        } else if (userData.id) {
            userId = userData.id;
            await updateDoc(doc(firestore, 'users', userId), userData);
        } else {
            const docRef = await addDoc(collection(firestore, 'users'), userData);
            userId = docRef.id;
        }

        if (ADMIN_ROLES.includes(userData.role)) {
            if (userData.email) {
                await setDoc(doc(firestore, 'admins', userData.email), { role: userData.role, userId: userId });
            }
        } else if (userData.id && userData.email) {
            try { await deleteDoc(doc(firestore, 'admins', userData.email)); } catch (err) { }
        }

        const updatedUsers = await fetchUsers();
        setUsers(updatedUsers);
        setIsAddActiveOpen(false);
        setEditingUser(null);
    };

    const handleSaveAlumni = async (alumniData, profilePicture, forcedId = null) => {
        if (!validateLinkedInUrl(alumniData.linkedinUrl)) {
            alert('LinkedIn URL must start with https://www.linkedin.com/in/ or linkedin.com/in/');
            return;
        }

        const profilePictureUrl = await uploadProfilePicture(profilePicture);
        if (profilePictureUrl) alumniData.profilePictureUrl = profilePictureUrl;

        delete alumniData.type;
        delete alumniData.originalType;

        if (forcedId) {
            await setDoc(doc(firestore, 'alumni', forcedId), alumniData);
        } else if (alumniData.id) {
            await updateDoc(doc(firestore, 'alumni', alumniData.id), alumniData);
        } else {
            await addDoc(collection(firestore, 'alumni'), alumniData);
        }

        const updatedAlumni = await fetchAlumni();
        setAlumni(updatedAlumni);
        setIsAddAlumniOpen(false);
        setEditingAlumni(null);
    };

    const convertToAlumni = async (userData) => {
        const confirmed = window.confirm(`Are you sure you want to convert ${userData.firstName} ${userData.lastName} to alumni?`);
        if (!confirmed) return;
        try {
            const alumniData = { ...userData };
            delete alumniData.id;
            delete alumniData.type;
            await handleSaveAlumni(alumniData, null, userData.id);
            await deleteDoc(doc(firestore, 'users', userData.id));
            if (userData.email) {
                try { await deleteDoc(doc(firestore, 'admins', userData.email)); } catch (err) { }
            }
            setUsers(await fetchUsers());
            setEditingUser(null);
        } catch (error) {
            console.error('Error converting user to alumni:', error);
            alert('Error converting user to alumni');
        }
    };

    const convertToUser = async (alumniData) => {
        const confirmed = window.confirm(`Are you sure you want to convert ${alumniData.firstName} ${alumniData.lastName} back to an active user?`);
        if (!confirmed) return;
        try {
            const userData = { ...alumniData };
            delete userData.id;
            delete userData.type;
            await handleSaveActive(userData, null, alumniData.id);
            await deleteDoc(doc(firestore, 'alumni', alumniData.id));
            setAlumni(await fetchAlumni());
            setEditingAlumni(null);
        } catch (error) {
            console.error('Error converting alumni to user:', error);
            alert('Error converting alumni to user');
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-page-bg font-sans text-charcoal antialiased">
            <main className="flex flex-col overflow-hidden w-full">
                {/* Header */}
                <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center flex-1">
                        <h1 className="font-display text-2xl font-bold text-charcoal mr-8">User Management</h1>
                        <div className="relative w-full max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                <span className="material-symbols-outlined text-sm">search</span>
                            </span>
                            <input
                                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-burgundy focus:border-primary-burgundy sm:text-sm transition-all"
                                placeholder="Search members by name, major, or class..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsAddAlumniOpen(true)}
                            className="flex items-center space-x-2 bg-[#FFD700] text-slate-900 px-4 py-2 rounded font-medium text-sm hover:bg-[#E6C200] transition-shadow shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-sm">workspace_premium</span>
                            <span>Add Alumni</span>
                        </button>
                        <button
                            onClick={() => setIsAddActiveOpen(true)}
                            className="flex items-center space-x-2 bg-primary-burgundy text-white px-4 py-2 rounded font-medium text-sm hover:bg-red-900 transition-shadow shadow-sm active:scale-95">
                            <span className="material-symbols-outlined text-sm">person_add</span>
                            <span>Add Active</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Stats Overview */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded shadow-sm border border-border-light hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Members</p>
                                    <h3 className="text-3xl font-bold mt-1">{users.length + alumni.length}</h3>
                                </div>
                                <div className="p-3 bg-red-50 text-primary-burgundy rounded">
                                    <span className="material-symbols-outlined">groups</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded shadow-sm border border-border-light hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Actives</p>
                                    <h3 className="text-3xl font-bold mt-1">{activeCount}</h3>
                                </div>
                                <div className="p-3 bg-yellow-50 text-brand-gold rounded">
                                    <span className="material-symbols-outlined">how_to_reg</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded shadow-sm border border-border-light hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Alumni</p>
                                    <h3 className="text-3xl font-bold mt-1">{alumniCount}</h3>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded">
                                    <span className="material-symbols-outlined">workspace_premium</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded shadow-sm border border-border-light hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Retention Rate</p>
                                    <h3 className="text-3xl font-bold mt-1">
                                        {users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0}%
                                    </h3>
                                </div>
                                <div className="p-3 bg-green-50 text-green-600 rounded">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Table Section */}
                    <section className="bg-white rounded shadow-sm border border-border-light overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Filter by:</span>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border-gray-300 rounded focus:ring-primary-burgundy focus:border-primary-burgundy">
                                    <option>All Statuses</option>
                                    <option>Active</option>
                                    <option>Alumni</option>
                                    <option>Dropped</option>
                                </select>
                                <select value={majorFilter} onChange={e => setMajorFilter(e.target.value)} className="text-sm border-gray-300 rounded focus:ring-primary-burgundy focus:border-primary-burgundy">
                                    {uniqueMajors.map(major => (
                                        <option key={major} value={major}>{major}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-border-light">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Grad Year</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Major</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-light">
                                    {allMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {member.profilePictureUrl ? (
                                                        <img src={member.profilePictureUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 text-xs">
                                                            {member.firstName?.[0]}{member.lastName?.[0]}
                                                        </div>
                                                    )}
                                                    <div className="ml-4">
                                                        <p className="text-sm font-bold text-charcoal">{member.firstName} {member.lastName}</p>
                                                        <p className="text-xs text-gray-500">{member.email || "No email"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.type === 'Active' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>}
                                                {member.type === 'Alumni' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Alumni</span>}
                                                {member.type === 'Dropped' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Dropped</span>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">{member.graduationYear}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{member.major}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => member.originalType === 'Alumni' ? setEditingAlumni(member) : setEditingUser(member)}
                                                    className="p-1 text-gray-400 hover:text-primary-burgundy transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>

            {/* Modals placed completely outside main to avoid z-index stacking issues if applicable, though fixed handles it */}
            {(isAddActiveOpen || editingUser) && (
                <ActiveMemberModal
                    isOpen={true}
                    initialData={editingUser}
                    onClose={() => { setIsAddActiveOpen(false); setEditingUser(null); }}
                    onSave={handleSaveActive}
                    availableBigs={availableBigs}
                    convertToAlumni={convertToAlumni}
                />
            )}

            {(isAddAlumniOpen || editingAlumni) && (
                <AlumniMemberModal
                    isOpen={true}
                    initialData={editingAlumni}
                    onClose={() => { setIsAddAlumniOpen(false); setEditingAlumni(null); }}
                    onSave={handleSaveAlumni}
                    availableBigs={availableBigs}
                    convertToUser={convertToUser}
                />
            )}
        </div>
    );
};

// Extracted Modals for cleanly separating state
const ActiveMemberModal = ({ isOpen, initialData, onClose, onSave, availableBigs, convertToAlumni }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        email: '', firstName: '', lastName: '', class: '',
        graduationYear: '', family: '', major: '', role: '',
        points: 0, profilePictureUrl: '', bigId: '', linkedinUrl: '',
        dropped: false, ...initialData
    });
    const [file, setFile] = useState(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-50 rounded-xl shadow-2xl border border-slate-200">
                <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-800">
                            <span className="material-symbols-outlined">{isEdit ? 'edit' : 'person_add'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Active Member' : 'Add New Active Member'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>
                <form className="p-6 space-y-6" onSubmit={e => { e.preventDefault(); onSave(formData, file); }}>
                    <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-300 rounded-xl bg-white">
                        <label className="relative group cursor-pointer flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                                {file ? (
                                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                ) : formData.profilePictureUrl ? (
                                    <img src={formData.profilePictureUrl} alt="profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-4xl text-slate-400">account_circle</span>
                                )}
                            </div>
                            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                            <span className="mt-3 text-sm font-semibold text-blue-600 hover:underline">Change Photo</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">First Name</label><input required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} /></div>
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Last Name</label><input required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} /></div>
                        <div className="md:col-span-2 space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">SCU Email</label><input type="email" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Class Name</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                                <option value="">Select Class</option>
                                {PLEDGE_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Graduation Year</label><input type="number" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.graduationYear} onChange={e => setFormData({ ...formData, graduationYear: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Family</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.family} onChange={e => setFormData({ ...formData, family: e.target.value })}>
                                <option value="">Select Family</option>
                                {AVAILABLE_FAMILIES.map(fam => <option key={fam} value={fam}>{fam}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Major</label><input className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.major} onChange={e => setFormData({ ...formData, major: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Fraternity Role</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                <option value="">No Role</option>
                                {AVAILABLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Big Brother</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.bigId} onChange={e => setFormData({ ...formData, bigId: e.target.value })}>
                                <option value="">Select Big</option>
                                {availableBigs.filter(b => b.id !== formData.id).map(b => (
                                    <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Prof. Points</label><input type="number" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.points} onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} /></div>
                        <div className="space-y-1.5 flex flex-col flex-1 items-start">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <label className="flex items-center space-x-2 mt-2">
                                <input type="checkbox" className="rounded text-red-800" checked={formData.dropped} onChange={e => setFormData({ ...formData, dropped: e.target.checked })} />
                                <span className="text-sm text-slate-700">Dropped</span>
                            </label>
                        </div>

                        <div className="md:col-span-2 space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">LinkedIn Profile URL</label><input type="text" placeholder="https://www.linkedin.com/in/..." className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-800 outline-none" value={formData.linkedinUrl} onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })} /></div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        {isEdit ? (
                            <button type="button" onClick={() => convertToAlumni(formData)} className="px-6 py-2.5 rounded-lg text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">Convert to Alumni</button>
                        ) : <div></div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-2.5 rounded-lg text-sm font-bold text-white bg-red-800 hover:bg-red-900 shadow-lg transition-all flex items-center gap-2">
                                {isEdit ? 'Save Changes' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AlumniMemberModal = ({ isOpen, initialData, onClose, onSave, availableBigs, convertToUser }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        email: '', firstName: '', lastName: '', class: '',
        graduationYear: '', family: '', major: '', role: '',
        points: 0, profilePictureUrl: '', bigId: '', linkedinUrl: '',
        dropped: false, ...initialData
    });
    const [file, setFile] = useState(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-50 rounded-xl shadow-2xl border border-slate-200">
                <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-50 text-yellow-800">
                            <span className="material-symbols-outlined">{isEdit ? 'edit' : 'person_add'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Alumni' : 'Add New Alumni'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>
                <form className="p-6 space-y-6" onSubmit={e => { e.preventDefault(); onSave(formData, file); }}>
                    <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-300 rounded-xl bg-white">
                        <label className="relative group cursor-pointer flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                                {file ? (
                                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                ) : formData.profilePictureUrl ? (
                                    <img src={formData.profilePictureUrl} alt="profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-4xl text-slate-400">account_circle</span>
                                )}
                            </div>
                            <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                            <span className="mt-3 text-sm font-semibold text-yellow-600 hover:underline">Change Photo</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">First Name</label><input required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} /></div>
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Last Name</label><input required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Personal Email</label><input type="email" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Graduation Year</label><input type="number" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.graduationYear} onChange={e => setFormData({ ...formData, graduationYear: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Family</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.family} onChange={e => setFormData({ ...formData, family: e.target.value })}>
                                <option value="">Select Family</option>
                                {AVAILABLE_FAMILIES.map(fam => <option key={fam} value={fam}>{fam}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">Major</label><input className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.major} onChange={e => setFormData({ ...formData, major: e.target.value })} /></div>

                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Big Brother</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.bigId} onChange={e => setFormData({ ...formData, bigId: e.target.value })}>
                                <option value="">Select Big</option>
                                {availableBigs.filter(b => b.id !== formData.id).map(b => (
                                    <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex flex-col items-start">
                            <label className="text-sm font-semibold text-slate-700">Pledge Class</label>
                            <select className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                                <option value="">Select Class</option>
                                {PLEDGE_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-1.5 flex flex-col items-start"><label className="text-sm font-semibold text-slate-700">LinkedIn Profile URL</label><input type="text" placeholder="https://www.linkedin.com/in/..." className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#FFD700] outline-none" value={formData.linkedinUrl} onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })} /></div>
                        <div className="space-y-1.5 flex flex-col flex-1 items-start md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <label className="flex items-center space-x-2 mt-2">
                                <input type="checkbox" className="rounded text-[#FFD700]" checked={formData.dropped} onChange={e => setFormData({ ...formData, dropped: e.target.checked })} />
                                <span className="text-sm text-slate-700">Dropped</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        {isEdit ? (
                            <button type="button" onClick={() => convertToUser(formData)} className="px-6 py-2.5 rounded-lg text-sm font-bold text-red-800 bg-red-50 hover:bg-red-100 transition-colors">Convert to Active</button>
                        ) : <div></div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button type="submit" className="px-8 py-2.5 rounded-lg text-sm font-bold text-slate-900 bg-[#FFD700] hover:bg-[#E6C200] shadow-lg transition-all flex items-center gap-2">
                                {isEdit ? 'Save Changes' : 'Add Alumni'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserManagement;