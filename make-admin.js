const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const userId = process.argv[2] || 'AXYnNwTzgWhwlLqhqDsNjcm8Wzr1';

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('Error: FIREBASE_PROJECT_ID environment variable not set');
  process.exit(1);
}

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: serviceAccountKey.json not found in project root');
  console.error('Please download your Firebase service account key from Firebase Console:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save it as serviceAccountKey.json in this directory');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function makeAdmin() {
  try {
    console.log(`Making user ${userId} an admin...`);
    
    const userRef = db.collection('profiles').doc(userId);
    await userRef.update({
      isAdmin: true,
    });
    
    console.log(`✓ Successfully made ${userId} an admin!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeAdmin();
