import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBfmzCyLI7PSzg_FxOryPkxs5Jn-qtPrbQ',
  authDomain: 'modifiying-test-app.firebaseapp.com',
  projectId: 'modifiying-test-app',
  storageBucket: 'modifiying-test-app.firebasestorage.app',
  messagingSenderId: '799641414780',
  appId: '1:799641414780:web:28bc02bc9f9c335ef76df9',
  measurementId: 'G-1S3QG43X0D'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
