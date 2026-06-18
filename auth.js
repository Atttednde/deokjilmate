/**
 * auth.js — Firebase Auth 기반 인증 유틸
 *
 * ▸ 모든 HTML에서 type="module" 스크립트 안에서 import해서 사용
 *   import { requireLogin, getCurrentUser, logout, onAuthReady } from './auth.js';
 */

import { auth } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ─────────────────────────────────────────
   현재 로그인 유저를 Promise로 반환
   (Auth 초기화 완료를 기다림)
───────────────────────────────────────── */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();          // 한 번만 실행
      resolve(user);    // user: 로그인 → User 객체 / 비로그인 → null
    });
  });
}

/* ─────────────────────────────────────────
   로그인 필수 페이지 가드
   비로그인이면 login.html 로 리다이렉트
───────────────────────────────────────── */
export async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    const page = encodeURIComponent(
      window.location.pathname.split('/').pop() + window.location.search
    );
    window.location.replace('login.html?redirect=' + page);
  }
  return user;
}

/* ─────────────────────────────────────────
   Auth 상태 변화 콜백 등록 헬퍼
   nav의 로그인/유저명 표시 등에 사용
───────────────────────────────────────── */
export function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}

/* ─────────────────────────────────────────
   로그아웃
───────────────────────────────────────── */
export async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}
