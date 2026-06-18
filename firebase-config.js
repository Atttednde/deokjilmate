// Firebase 콘솔 → 프로젝트 설정 → 내 앱 → SDK 설정 및 구성
import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAezhggUCrngH76HJjlrZYtiwk3mK4xlwg",
    authDomain: "web2026-d8798.firebaseapp.com",
    projectId: "web2026-d8798",
    storageBucket: "web2026-d8798.firebasestorage.app",
    messagingSenderId: "138413589942",
    appId: "1:138413589942:web:b5379056022f389286ed17",
    measurementId: "G-W4QLGGQ65V"


};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db   = getFirestore(app);
 
