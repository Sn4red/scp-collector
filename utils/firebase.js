const firebase = require('firebase-admin');
const serviceAccount = require(process.env.FIREBASE_PRIVATE_KEY);

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL,
});

module.exports = firebase;
