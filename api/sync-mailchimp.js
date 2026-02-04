
import { db } from './_lib/firebaseAdmin';
import mailchimp from '@mailchimp/mailchimp_marketing';
import crypto from 'crypto';

mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER_PREFIX,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const { audienceId } = req.body;
    const listId = audienceId || process.env.MAILCHIMP_AUDIENCE_ID;

    if (!listId) {
        return res.status(400).json({ error: 'Missing Audience ID (listId). Set MAILCHIMP_AUDIENCE_ID env var or pass in body.' });
    }

    try {
        console.log('Starting Mailchimp Sync...');

        // 1. Fetch all users from Firebase
        const usersSnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            return res.status(200).json({ message: 'No users found in Firebase to sync.' });
        }

        const updates = [];
        const errors = [];

        // 2. Iterate and prepare updates
        // We will process them appropriately. For a large number of users, batch operations are better,
        // but for < 1000 users, sequential or parallel promises are okay. Let's do parallel with a limit if needed.
        // For Vercel timeouts, we might want to be careful, but let's try a Promise.all for now as it's likely <100 active members.

        const updatePromises = usersSnapshot.docs.map(async (doc) => {
            const userData = doc.data();
            const email = userData.email;
            const points = userData.points || 0;

            if (!email) return;

            const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

            try {
                // Upsert member (Add or Update)
                await mailchimp.lists.setListMember(listId, subscriberHash, {
                    email_address: email,
                    status_if_new: 'subscribed', // Only subscribe if they are new. If they are unsubscribed, this might resubscribe them? 
                    // Actually setListMember creates or updates. 
                    // Important: If a user is 'unsubscribed', we shouldn't force them back to 'subscribed' usually.
                    // But if we omit status, it might define it. 
                    // Let's use 'status_if_new'.

                    merge_fields: {
                        POINTS: points,
                        FNAME: userData.firstName || '',
                        LNAME: userData.lastName || ''
                    }
                });
                updates.push({ email, points, status: 'synced' });
            } catch (err) {
                console.error(`Failed to sync ${email}:`, err.response?.text || err.message);
                errors.push({ email, error: err.response?.body?.title || err.message });
            }
        });

        await Promise.all(updatePromises);

        console.log(`Sync complete. Success: ${updates.length}, Errors: ${errors.length}`);
        return res.status(200).json({
            message: 'Sync process completed',
            stats: {
                total_scanned: usersSnapshot.size,
                successful_updates: updates.length,
                failed_updates: errors.length
            },
            errors: errors // Return errors for debugging
        });

    } catch (error) {
        console.error('General Sync Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
