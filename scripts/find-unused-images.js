#!/usr/bin/env node
/**
 * find-unused-images.js
 *
 * Finds Firebase Storage images that are not referenced by any Firestore document.
 * Checks the `profilePictures/` folder against `users` and `alumni` collections.
 *
 * Usage:
 *   node scripts/find-unused-images.js
 *   node scripts/find-unused-images.js --delete   (permanently deletes unused files — use with caution!)
 *
 * Requires the Firebase Admin SDK service account JSON at the project root:
 *   "SCU Theta Tau Firebase Admin SDK.json"
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ── Config ───────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'SCU Theta Tau Firebase Admin SDK.json');
const STORAGE_FOLDER = 'profilePictures/';
const FIRESTORE_COLLECTIONS = ['users', 'alumni'];
const PROFILE_PIC_FIELD = 'profilePictureUrl';

// ── Init ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`ERROR: Service account file not found at:\n  ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts a normalized storage path from either:
 *   - A raw path:  "profilePictures/1234_foo.jpg"
 *   - A full URL:  "https://firebasestorage.googleapis.com/v0/b/BUCKET/o/profilePictures%2F1234_foo.jpg?..."
 *
 * Returns null for Google Photos URLs or empty values.
 */
function extractStoragePath(url) {
    if (!url || url.startsWith('https://lh3.googleusercontent.com/')) return null;

    // Full Firebase Storage download URL
    if (url.startsWith('https://firebasestorage.googleapis.com/')) {
        try {
            const urlObj = new URL(url);
            // pathname is like /v0/b/BUCKET/o/profilePictures%2Ffilename.jpg
            const parts = urlObj.pathname.split('/o/');
            if (parts.length < 2) return null;
            return decodeURIComponent(parts[1].split('?')[0]);
        } catch {
            return null;
        }
    }

    // Assume it's already a raw storage path
    return url;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const shouldDelete = process.argv.includes('--delete');

    console.log('═══════════════════════════════════════════════════');
    console.log('  Firebase Unused Image Finder');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. List all files in profilePictures/ in Storage
    console.log(`Listing files in Storage: gs://${bucket.name}/${STORAGE_FOLDER}...`);
    const [storageFiles] = await bucket.getFiles({ prefix: STORAGE_FOLDER });

    // Filter out any folder "placeholder" objects (zero-byte objects named exactly as the folder)
    const storageFilePaths = storageFiles
        .map(f => f.name)
        .filter(name => name !== STORAGE_FOLDER);

    console.log(`  Found ${storageFilePaths.length} files in Storage.\n`);

    // 2. Collect all profilePictureUrl values from Firestore
    const referencedPaths = new Set();

    for (const collectionName of FIRESTORE_COLLECTIONS) {
        console.log(`Scanning Firestore collection: ${collectionName}...`);
        const snapshot = await db.collection(collectionName).get();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const rawUrl = data[PROFILE_PIC_FIELD];
            const storagePath = extractStoragePath(rawUrl);
            if (storagePath) {
                referencedPaths.add(storagePath);
                count++;
            }
        });

        console.log(`  Found ${snapshot.size} documents, ${count} with storage-backed profile pictures.\n`);
    }

    // 3. Cross-reference
    const unusedFiles = storageFilePaths.filter(p => !referencedPaths.has(p));
    const usedFiles   = storageFilePaths.filter(p =>  referencedPaths.has(p));

    // 4. Report
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Results`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Total files in Storage : ${storageFilePaths.length}`);
    console.log(`  Referenced by Firestore: ${usedFiles.length}`);
    console.log(`  Unused (orphaned)      : ${unusedFiles.length}\n`);

    if (unusedFiles.length === 0) {
        console.log('No unused images found. Storage is clean!');
        return;
    }

    // Fetch metadata (size) for unused files
    console.log('Unused files:');
    console.log('─────────────────────────────────────────────────────────────────────');

    let totalBytes = 0;
    const unusedFileObjects = [];

    for (const filePath of unusedFiles) {
        const file = bucket.file(filePath);
        const [meta] = await file.getMetadata();
        const sizeKB = (parseInt(meta.size, 10) / 1024).toFixed(1);
        totalBytes += parseInt(meta.size, 10);
        unusedFileObjects.push({ filePath, file, sizeKB });
        console.log(`  ${filePath}`);
        console.log(`    Size: ${sizeKB} KB  |  Updated: ${meta.updated}`);
    }

    console.log('─────────────────────────────────────────────────────────────────────');
    console.log(`  Total reclaimable space: ${(totalBytes / 1024 / 1024).toFixed(2)} MB\n`);

    // 5. Optionally delete
    if (shouldDelete) {
        console.log('⚠  --delete flag detected. Deleting unused files...\n');
        for (const { filePath, file } of unusedFileObjects) {
            await file.delete();
            console.log(`  Deleted: ${filePath}`);
        }
        console.log(`\nDone. ${unusedFileObjects.length} files deleted.`);
    } else {
        console.log('To permanently delete these files, re-run with the --delete flag:');
        console.log('  node scripts/find-unused-images.js --delete\n');
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
