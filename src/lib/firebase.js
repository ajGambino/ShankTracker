// src/lib/firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // add later when we wire auth

const firebaseConfig = {
	apiKey: 'AIzaSyB4xdJXafY_YRCiOqu3bYLr9j91QaJgQqo',
	authDomain: 'shanktracker.firebaseapp.com',
	projectId: 'shanktracker',
	storageBucket: 'shanktracker.firebasestorage.app',
	messagingSenderId: '332874456955',
	appId: '1:332874456955:web:8d4d991d261bff5d32e7de',
	measurementId: 'G-7ZD3S8KDRE',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const auth = getAuth(app); // later

export { app, db };
