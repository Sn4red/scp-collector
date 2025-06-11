const firebase = require('firebase-admin');

// * Replaces every real newline character '\n' with the escaped version '\\n'
// * to avoid issues with the parsing.
const safeString = process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\\n');

// * Parses the stringified JSON to a real JSON object.
const serviceAccount = JSON.parse(safeString);

// * Replaces the escaped newline characters '\\n' back to real newlines '\n'.
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// * Initializes the Firebase Admin SDK with the service account credentials.
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

module.exports = firebase;
