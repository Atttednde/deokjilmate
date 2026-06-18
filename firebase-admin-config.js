import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./webtoon_serviceAccountKey.json');

 
const adminApp = initializeApp({
  credential: cert(serviceAccount)
});



export const db = getFirestore();
export const app = adminApp; 