import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const PLEDGE_CLASSES = [
    "Founding Class", "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];

const Directory = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [majorFilter, setMajorFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [gradYearFilter, setGradYearFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const membersPerPage = 24;

    useEffect(() => {
        const fetchDirectory = async () => {
            try {
                const [usersSnapshot, alumniSnapshot] = await Promise.all([
                    getDocs(collection(firestore, 'users')),
                    getDocs(collection(firestore, 'alumni'))
                ]);

                const activeMembers = usersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), type: 'Active' }))
                    .filter(user => !user.dropped);

                const alumniMembers = alumniSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), type: 'Alumni' }))
                    .filter(user => !user.dropped);

                setMembers([...activeMembers, ...alumniMembers]);
            } catch (error) {
                console.error("Error fetching directory:", error);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate('/login');
                return;
            }
            fetchDirectory();
        });

        return () => unsubscribe();
    }, [navigate]);

    // Extract unique values for filters
    const uniqueMajors = useMemo(() => {
        return ['All Majors', ...new Set(members.map(m => m.major).filter(Boolean).sort())];
    }, [members]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(members.map(m => m.class).filter(Boolean));
        return ['All Classes', ...Array.from(classes).sort((a, b) => {
            const idxA = PLEDGE_CLASSES.indexOf(a);
            const idxB = PLEDGE_CLASSES.indexOf(b);
            if (idxA === -1 && idxB === -1) return a.localeCompare(b);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        })];
    }, [members]);

    const uniqueGradYears = useMemo(() => {
        return ['All Grad Years', ...new Set(members.map(m => m.graduationYear).filter(Boolean).sort())];
    }, [members]);

    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                (member.firstName?.toLowerCase().includes(searchLower)) ||
                (member.lastName?.toLowerCase().includes(searchLower)) ||
                (member.major?.toLowerCase().includes(searchLower)) ||
                (member.class?.toLowerCase().includes(searchLower));

            const matchesMajor = !majorFilter || majorFilter === 'All Majors' || member.major === majorFilter;
            const matchesType = !typeFilter || typeFilter === 'All Types' || member.type === typeFilter;
            const matchesClass = !classFilter || classFilter === 'All Classes' || member.class === classFilter;
            const matchesGradYear = !gradYearFilter || gradYearFilter === 'All Grad Years' || String(member.graduationYear) === String(gradYearFilter);

            return matchesSearch && matchesMajor && matchesType && matchesClass && matchesGradYear;
        }).sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [members, searchQuery, majorFilter, typeFilter, classFilter, gradYearFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
    const paginatedMembers = filteredMembers.slice(
        (currentPage - 1) * membersPerPage,
        currentPage * membersPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, majorFilter, typeFilter, classFilter, gradYearFilter]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setMajorFilter('');
        setTypeFilter('');
        setClassFilter('');
        setGradYearFilter('');
    };

    const handleCardClick = (member) => {
        if (member.linkedinUrl) {
            let url = member.linkedinUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-sans">
            <main className="flex flex-col flex-1 px-6 md:px-40 py-10 max-w-[1400px] mx-auto w-full">
                {/* Page Title Section */}
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="font-anton uppercase tracking-tight text-4xl md:text-5xl text-slate-900 dark:text-white">Brotherhood Directory</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl">Connect with actives and alumni.</p>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-10">
                    <div className="flex flex-col gap-6">
                        {/* Search Input */}
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined">search</span>
                            </div>
                            <input
                                className="block w-full p-4 pl-12 text-base text-slate-900 border border-slate-200 rounded-xl bg-slate-50 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-400 dark:text-white outline-none transition-all"
                                placeholder="Search by name, major, or class..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filters Grid */}
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mr-2">Filter By:</span>
                            
                            <select 
                                value={majorFilter} 
                                onChange={(e) => setMajorFilter(e.target.value)}
                                className="py-2 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:border-primary transition-all outline-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Major</option>
                                {uniqueMajors.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>

                            <select 
                                value={typeFilter} 
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="py-2 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:border-primary transition-all outline-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Member Type</option>
                                <option value="All Types">All Types</option>
                                <option value="Active">Active</option>
                                <option value="Alumni">Alumni</option>
                            </select>

                            <select 
                                value={classFilter} 
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="py-2 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:border-primary transition-all outline-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Class</option>
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select 
                                value={gradYearFilter} 
                                onChange={(e) => setGradYearFilter(e.target.value)}
                                className="py-2 pl-4 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:border-primary transition-all outline-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Grad Year</option>
                                {uniqueGradYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>

                            <button 
                                onClick={handleClearFilters}
                                className="ml-auto text-primary text-sm font-bold hover:underline"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20 text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-4xl">autorenew</span>
                        <span className="ml-2 font-medium">Loading Directory...</span>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 bg-opacity-50">
                        <span className="material-symbols-outlined text-5xl mb-3">group_off</span>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No members found</h3>
                        <p className="mt-1">Try adjusting your search criteria.</p>
                        <button onClick={handleClearFilters} className="mt-4 text-primary font-bold hover:underline">Clear Filters</button>
                    </div>
                ) : (
                    <>
                        {/* Members Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedMembers.map((member) => (
                                <div key={member.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                                    <div className="relative flex justify-center items-center pt-8 pb-4 w-full flex-shrink-0">
                                        <div className="absolute top-4 right-4 z-20">
                                            {member.type === 'Active' ? (
                                                <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm">Active</span>
                                            ) : (
                                                <span className="bg-accent text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm">Alumni</span>
                                            )}
                                        </div>
                                        
                                        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden flex-shrink-0">
                                            <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/0 transition-colors z-10"></div>
                                            {member.profilePictureUrl ? (
                                                <img
                                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    src={member.profilePictureUrl}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                                                    <span className="material-symbols-outlined text-6xl">person</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="p-5 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-anton uppercase tracking-wide text-xl text-slate-900 dark:text-white line-clamp-1">{member.firstName} {member.lastName}</h3>
                                            {member.linkedinUrl && (
                                                <button
                                                    onClick={() => handleCardClick(member)}
                                                    className="text-slate-400 hover:text-[#0077b5] transition-colors ml-2"
                                                    title={`View ${member.firstName}'s LinkedIn`}
                                                >
                                                    <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1 line-clamp-1">
                                            {member.major || 'Unknown Major'}
                                        </p>
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500 text-xs mb-5">
                                            <span className="material-symbols-outlined text-sm">school</span>
                                            <span className="line-clamp-1">
                                                {member.class ? `Class: ${member.class}` : 'Unknown Class'}
                                                {member.graduationYear && ` • ${member.graduationYear}`}
                                            </span>
                                        </div>
                                        <div className="mt-auto">
                                            {member.linkedinUrl ? (
                                                <button 
                                                    onClick={() => handleCardClick(member)}
                                                    className="w-full py-2.5 bg-background-light dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 font-bold text-sm rounded-lg transition-all border border-slate-200 dark:border-slate-700 hover:border-primary"
                                                >
                                                    View Profile
                                                </button>
                                            ) : (
                                                <button 
                                                    disabled
                                                    className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm rounded-lg border border-slate-100 dark:border-slate-800 cursor-not-allowed"
                                                    title="No LinkedIn profile provided"
                                                >
                                                    No Profile Available
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 mt-12 pt-6">
                                <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                                    Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * membersPerPage + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * membersPerPage, filteredMembers.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{filteredMembers.length}</span> members
                                </p>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    
                                    <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            // Show limited pages (current, first, last, and +-1)
                                            if (
                                                page === 1 || 
                                                page === totalPages || 
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button 
                                                        key={`page-${page}`}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-1.5 font-bold text-sm rounded transition-colors ${
                                                            currentPage === page 
                                                                ? 'bg-primary text-white' 
                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                (page === 2 && currentPage > 3) || 
                                                (page === totalPages - 1 && currentPage < totalPages - 2)
                                            ) {
                                                return <span key={`dots-${page}`} className="text-slate-400 px-1 py-1.5">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default Directory;
