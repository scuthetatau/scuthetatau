
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

        // Helper for delay
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // 2. Process in Batches to respect Rate Limits
        const BATCH_SIZE = 5;
        const docs = usersSnapshot.docs;

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const chunk = docs.slice(i, i + BATCH_SIZE);

            const chunkPromises = chunk.map(async (doc) => {
                const userData = doc.data();
                const email = userData.email;
                const points = userData.points || 0;

                if (!email) return;

                const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

                try {
                    await mailchimp.lists.setListMember(listId, subscriberHash, {
                        email_address: email,
                        status_if_new: 'subscribed',
                        merge_fields: {
                            POINTS: points,
                            FNAME: userData.firstName || '',
                            LNAME: userData.lastName || ''
                        }
                    });
                    updates.push({ email, points, status: 'synced' });
                } catch (err) {
                    // console.error(`Failed to sync ${email}:`, err.response?.text || err.message);
                    errors.push({ email, error: err.response?.body?.title || err.message });
                }
            });

            await Promise.all(chunkPromises);

            // Add a small delay between batches
            if (i + BATCH_SIZE < docs.length) {
                await delay(1000); // 1 second delay between batches
            }
        }

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
