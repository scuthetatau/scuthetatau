import React, { useEffect, useState } from 'react';
import Tree from 'react-d3-tree';
import { collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../firebase';
import genericProfile from './assets/WhiteTT.png';
import './FamilyTree.css';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const FamilyTree = () => {
    const [users, setUsers] = useState([]);
    const [alumni, setAlumni] = useState([]);
    const [treeData, setTreeData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate('/login');
                return;
            }
            fetchAllMembers();
        });

        return () => unsubscribe();
    }, [navigate]);

    const fetchAllMembers = async () => {
        // Fetch current users
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAlumni: false
        }));
        setUsers(usersData);

        // Fetch alumni
        const alumniSnapshot = await getDocs(collection(firestore, 'alumni'));
        const alumniData = alumniSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAlumni: true
        }));
        setAlumni(alumniData);

        // Combine and build tree
        buildTree([...usersData, ...alumniData]);
    };

    const buildTree = (allMembers) => {
        const memberMap = new Map(allMembers.map(member => [member.id, member]));

        // Define the four families
        const families = [
            { name: "Filthy Fam", members: [] },
            { name: "Presibobante Guys", members: [] },
            { name: "Engh Gang", members: [] },
            { name: "Clout Fam", members: [] }
        ];

        // Group members by family
        allMembers.forEach(member => {
            const family = families.find(f => f.name === member.family);
            if (family) {
                family.members.push(member);
            }
        });

        const buildNode = (memberId) => {
            const member = memberMap.get(memberId);
            if (!member) return null;

            const node = {
                name: `${member.firstName} ${member.lastName}`,
                attributes: {
                    class: member.class || member.graduationYear || 'Unknown',
                    isAlumni: member.isAlumni,
                    isDropped: member.dropped || false
                },
                profilePicture: member.profilePictureUrl || genericProfile
            };

            // Find all littles (both current members and alumni)
            const littles = allMembers.filter(m => m.bigId === memberId);
            if (littles.length > 0) {
                node.children = littles.map(little => buildNode(little.id));
            }

            return node;
        };

        // Build family nodes
        const familyNodes = families.map(family => {
            return {
                name: family.name,
                attributes: {
                    isFamily: true
                },
                children: family.members
                    .filter(member => !member.bigId) // Only include root members of each family
                    .map(member => buildNode(member.id))
            };
        });

        const tree = {
            name: 'Theta Tau Family Tree',
            children: familyNodes
        };

        setTreeData(tree);
    };

    const CustomNode = ({ nodeDatum, toggleNode }) => {
        const className = nodeDatum?.attributes?.class || 'Unknown';
        const profilePicture = nodeDatum?.profilePicture || genericProfile;
        const name = nodeDatum?.name || 'Unknown';
        const isAlumni = nodeDatum?.attributes?.isAlumni || nodeDatum?.attributes?.isDropped;
        const isFamily = nodeDatum?.attributes?.isFamily;

        return (
            <g className={`node ${isAlumni ? 'alumni' : ''}`}>
                <circle r={30} fill={isAlumni ? '#252525' : '#881616'} />
                <circle r={25} fill="none" stroke={isAlumni ? '#252525' : '#881616'} strokeWidth="2" />
                <foreignObject x="-25" y="-25" width="50" height="50">
                    <img
                        src={profilePicture}
                        alt="profile"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                        loading="lazy"
                    />
                </foreignObject>
                <rect
                    x="-50"
                    y="31"
                    width="100"
                    height={isFamily ? "20" : "33"}
                    fill="#ffffff"
                    stroke="none"
                    rx="5"
                />
                <text
                    dy={isFamily ? "45" : "45"}
                    textAnchor="middle"
                    className="name"
                    style={{
                        fontSize: '14px',
                        fill: '#252525',
                        fontFamily: 'Mohave, sans-serif'
                    }}
                >
                    {name}
                </text>
                {!isFamily && (
                    <text
                        dy="60"
                        textAnchor="middle"
                        className="class"
                        style={{
                            fontSize: '12px',
                            fill: '#666',
                            fontFamily: 'Mohave, sans-serif'
                        }}
                    >
                        {className}
                    </text>
                )}
            </g>
        );
    };

    return (
        <div className="family-tree-container">
            <h2>FAMILY TREE</h2>
            {treeData && (
                <div style={{ width: '100%', height: 'calc(100vh - 180px)' }}>
                    <Tree
                        data={treeData}
                        orientation="vertical"
                        pathFunc="step"
                        translate={{ x: 500, y: 50 }}
                        nodeSize={{ x: 150, y: 150 }} // Use this to control the size of nodes
                        renderCustomNodeElement={CustomNode}
                        separation={{ siblings: 1, nonSiblings: 1.5 }} // Change the spacing between nodes in the tree
                    />
                </div>
            )}
        </div>
    );
};

export default FamilyTree; 