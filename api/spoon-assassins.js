import admin, { db } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Fetch all targets to calculate alive count and process reassignment
        const targetsSnapshot = await db.collection('targets').get();
        const allTargets = targetsSnapshot.docs.map(doc => doc.data());

        const targetsMap = new Map();
        allTargets.forEach(t => targetsMap.set(t.userId, t));

        let currentSpoonData = targetsMap.get(userId) || null;

        if (currentSpoonData && currentSpoonData.targetId && currentSpoonData.isEliminated === false) {
            let tempTargetId = currentSpoonData.targetId;
            let currentTargetInfo = targetsMap.get(tempTargetId);
            
            const visitedIds = new Set([userId]);

            // Loop to find the next alive target in the chain
            while (currentTargetInfo && currentTargetInfo.isEliminated) {
                if (visitedIds.has(currentTargetInfo.userId)) {
                    currentTargetInfo = null;
                    break;
                }
                visitedIds.add(currentTargetInfo.userId);
                
                const nextTargetId = currentTargetInfo.targetId;
                currentTargetInfo = targetsMap.get(nextTargetId);
                
                if (currentTargetInfo && currentTargetInfo.userId === userId) {
                    break;
                }
            }

            if (currentTargetInfo && currentTargetInfo.userId === userId) {
                // User has won! Update local display state
                currentSpoonData = {
                    ...currentSpoonData,
                    targetId: null,
                    targetName: 'YOU WON! (LAST ONE STANDING)'
                };
            } else if (currentTargetInfo && currentTargetInfo.userId !== currentSpoonData.targetId && !currentTargetInfo.isEliminated) {
                // We found a new alive target, update the user's target document
                const updatedData = {
                    ...currentSpoonData,
                    targetId: currentTargetInfo.userId,
                    targetName: `${currentTargetInfo.firstName} ${currentTargetInfo.lastName}`.trim()
                };
                await db.collection('targets').doc(userId).set(updatedData);
                currentSpoonData = updatedData;
            } else if (!currentTargetInfo && currentSpoonData.targetId) {
                // Target chain broken or everyone dead
                currentSpoonData = {
                    ...currentSpoonData,
                    targetId: null,
                    targetName: 'NO VALID TARGETS LEFT'
                };
            }
        }

        const aliveCount = allTargets.filter(t => !t.isEliminated).length;
        const totalActiveCount = allTargets.length;

        // Fetch round end time from config
        let roundEndTime = null;
        try {
            const configDoc = await db.collection('game_config').doc('spoon_assassins').get();
            if (configDoc.exists) {
                const data = configDoc.data();
                if (data.roundEndTime) {
                    roundEndTime = data.roundEndTime.toDate ? data.roundEndTime.toDate().toISOString() : data.roundEndTime;
                }
            }
        } catch (configError) {
            console.warn('Could not fetch round timer config:', configError.message);
        }

        return res.status(200).json({
            userTarget: currentSpoonData,
            aliveCount,
            totalActiveCount,
            gameConfig: {
                roundEndTime
            }
        });
    } catch (error) {
        console.error('Error in spoon-assassins API:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
