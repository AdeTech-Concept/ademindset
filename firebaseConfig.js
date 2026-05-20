import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCvsTkjyCrtKBiiEPLFowYa7nK1c8o10kc",
  authDomain: "ademindset-2d6b3.firebaseapp.com",
  projectId: "ademindset-2d6b3",
  storageBucket: "ademindset-2d6b3.firebasestorage.app",
  messagingSenderId: "225781448424",
  appId: "1:225781448424:web:cd0b74c00eb91abc1f135d"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, db, storage };




