/**
 * data.js — Firestore CRUD 헬퍼
 *
 * books 컬렉션의 문서 ID = 자동생성 문자열 (예: "TmGxkQabc123")
 * 모든 bookId는 String으로 통일해서 사용
 */

import { db, auth } from './firebase-config.js';
import {
  collection, doc,
  addDoc, setDoc, getDoc, getDocs, deleteDoc, updateDoc,
  query, where, orderBy, serverTimestamp, increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


/* ════════════════════════════════════════
   공통 SVG 아이콘
════════════════════════════════════════ */
export const THUMB_UP_SVG    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
export const THUMB_DOWN_SVG  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
export const BOOK_SVG_SM     = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="4" width="24" height="32" rx="2" stroke="white" stroke-width="2"/><circle cx="20" cy="16" r="5" stroke="white" stroke-width="1.5"/><path d="M12 30 Q20 22 28 30" stroke="white" stroke-width="1.5"/></svg>`;
export const BOOK_SVG_LG     = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="10" y="5" width="36" height="46" rx="3" stroke="#aaa" stroke-width="2"/><circle cx="28" cy="22" r="8" stroke="#aaa" stroke-width="1.5"/><path d="M16 44 Q28 32 40 44" stroke="#aaa" stroke-width="1.5"/></svg>`;
export const BOOK_SVG_DETAIL = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><rect x="15" y="8" width="50" height="64" rx="4" stroke="#aaa" stroke-width="3"/><circle cx="40" cy="30" r="12" stroke="#aaa" stroke-width="2.5"/><path d="M22 62 Q40 44 58 62" stroke="#aaa" stroke-width="2.5"/></svg>`;


/* ════════════════════════════════════════
   UI 헬퍼
════════════════════════════════════════ */

/** 별점 SVG 문자열 반환 */
export function renderStars(count, size = 16) {
  return [1,2,3,4,5].map(i =>
    `<svg class="star ${i <= count ? 'filled' : ''}"
          style="width:${size}px;height:${size}px" viewBox="0 0 20 20">
       <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"
                fill="currentColor"/>
     </svg>`
  ).join('');
}

/**
 * 리뷰 카드 HTML
 * r: { id, rating, content, username, createdAt(Timestamp), upvotes, downvotes, uid }
 */
export function reviewCardHTML(r, currentUserId) {
  const isOwner = currentUserId && r.uid === currentUserId;
  const date    = r.createdAt?.toDate
    ? r.createdAt.toDate().toLocaleDateString('ko-KR')
    : (r.date || '');

  return `
    <div class="review-item" data-review-id="${r.id || ''}">
      <div class="stars">${renderStars(r.rating ?? 0)}</div>
      <div class="review-content">${r.content}</div>
      <div class="review-footer">
        <div class="reviewer">
          <div class="avatar"></div>
          <div class="reviewer-info">
            <div class="name">${r.username || ''}</div>
            <div class="date">${date}</div>
          </div>
        </div>
        <div class="vote-btns">
          <button class="vote-btn" onclick="handleUpvote('${r.id}')">
            ${THUMB_UP_SVG} <span id="up-${r.id}">${r.upvotes ?? 0}</span>
          </button>
          <button class="vote-btn" onclick="handleDownvote('${r.id}')">
            ${THUMB_DOWN_SVG} <span id="down-${r.id}">${r.downvotes ?? 0}</span>
          </button>
          ${isOwner
            ? `<button class="vote-btn" style="color:#e53e3e"
                       onclick="handleDeleteReview('${r.id}')">삭제</button>`
            : ''}
        </div>
      </div>
    </div>`;
}


/* ════════════════════════════════════════
   Firestore — 작품(books) 조회
   bookId = Firestore 자동생성 문서 ID (문자열)
════════════════════════════════════════ */

/**
 * 작품 목록 가져오기
 * @param {{ genre?: string, tags?: string[], query?: string, limit?: number }} opts
 */
export async function fetchBooks({ genre, tags = [], query: q = '', limit: lim = 200 , collectionName = 'books'} = {}) {
  const constraints = [];
  // webtoons 컬렉션은 모두 웹툰이므로 genre 필터 불필요
  if (collectionName === 'books' && genre && genre !== '전체') {
    constraints.push(where('genre', '==', genre));
  }

  // 'books' 대신 파라미터로 받은 collectionName 사용
  const snap = await getDocs(
    constraints.length
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName)
  );
  let books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (q) {
    const lower = q.toLowerCase();
    books = books.filter(b =>
      (b.title  || '').toLowerCase().includes(lower) ||
      (b.author || '').toLowerCase().includes(lower) ||
      // webtoons는 tags 대신 genres 필드 사용
      (b.tags || b.genres || []).some(t => (t || '').toLowerCase().includes(lower))
    );
  }

  if (tags.length > 0) {
    books = books.filter(b =>
      tags.every(t =>
        (b.tags    || []).includes(t) ||
        (b.genres  || []).includes(t)  // webtoons는 genres 필드
      )
    );
  }

  return books.slice(0, lim);
}

/**
 * 단일 작품 가져오기
 * @param {string} bookId  Firestore 문서 ID
 */
export async function fetchBookById(bookId, collectionName = 'books') {
  if (!bookId) return null;
  const idStr = String(bookId);

  const snap = await getDoc(doc(db, collectionName, idStr));
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  // 못 찾으면 반대 컬렉션도 확인 (webtoons ↔ books)
  const other = collectionName === 'books' ? 'webtoons' : 'books';
  const snap2 = await getDoc(doc(db, other, idStr));
  return snap2.exists() ? { id: snap2.id, ...snap2.data() } : null;
}

/**
 * 후기 작성 후 작품의 평균 별점 업데이트
 * books 문서에 avgRating, reviewCount 필드 갱신
 * @param {string} bookId
 */
export async function updateBookAvgRating(bookId) {
  const bookIdStr = String(bookId);

  // where 단독 쿼리 (복합 인덱스 불필요) 로 전체 리뷰 가져오기
  const snap = await getDocs(
    query(collection(db, 'reviews'), where('bookId', '==', bookIdStr))
  );

  const reviews = snap.docs.map(d => d.data());
  if (!reviews.length) return;

  const total = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  const avg   = Math.round((total / reviews.length) * 10) / 10;

  // avgRating 필드를 덮어써서 항상 최신 평균이 반영되도록
  await updateDoc(doc(db, 'books', bookIdStr), {
    avgRating:   avg,
    reviewCount: reviews.length,
  });

  console.log(`[별점 업데이트] bookId=${bookIdStr} avg=${avg} count=${reviews.length}`);
  return avg;   // 호출 측에서 바로 사용 가능하도록 반환
}


/* ════════════════════════════════════════
   Firestore — 후기(reviews)
   bookId = books 컬렉션 자동생성 문서 ID 문자열
════════════════════════════════════════ */

/**
 * 후기 추가
 * @param {string} bookId   books 컬렉션 문서 ID
 * @param {string} content
 * @param {number} rating   1~5
 */
export async function addReview(bookId, content, rating) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const ref = await addDoc(collection(db, 'reviews'), {
    bookId:    String(bookId),   // 항상 문자열로 저장
    uid:       user.uid,
    username:  user.displayName || user.email.split('@')[0],
    content,
    rating:    Number(rating),
    upvotes:   0,
    downvotes: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * 특정 작품의 후기 목록
 * @param {string} bookId
 * @param {'latest'|'popular'} sort
 *
 * ⚠️ where + orderBy 복합 쿼리는 Firestore 복합 인덱스 필요.
 *    처음 실행 시 콘솔에 인덱스 생성 링크가 뜹니다 → 클릭하면 자동 생성.
 *    또는: firebase deploy --only firestore:indexes
 */
export async function getReviews(bookId, sort = 'latest') {
  const bookIdStr = String(bookId);

  try {
    const order = sort === 'popular'
      ? orderBy('upvotes', 'desc')
      : orderBy('createdAt', 'desc');

    const snap = await getDocs(query(
      collection(db, 'reviews'),
      where('bookId', '==', bookIdStr),
      order
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));

  } catch(e) {
    // 인덱스 미생성 fallback: where만 걸고 클라이언트 정렬
    console.warn('복합 인덱스 없음 → fallback 사용. 아래 링크로 인덱스 생성하세요:', e.message);

    const snap = await getDocs(query(
      collection(db, 'reviews'),
      where('bookId', '==', bookIdStr)
    ));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => sort === 'popular'
        ? (b.upvotes || 0) - (a.upvotes || 0)
        : (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
  }
}

/**
 * 후기 삭제 (본인만)
 * @param {string} reviewId  reviews 컬렉션 문서 ID
 */
export async function deleteReview(reviewId) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const ref  = doc(db, 'reviews', reviewId);
  const snap = await getDoc(ref);
  if (!snap.exists())                      throw new Error('후기가 없습니다.');
  if (snap.data().uid !== user.uid)        throw new Error('본인 후기만 삭제할 수 있습니다.');

  await deleteDoc(ref);
}

/**
 * 추천 / 비추천
 * @param {string} reviewId
 * @param {'up'|'down'} type
 */
export async function voteReview(reviewId, type) {
  await updateDoc(doc(db, 'reviews', reviewId), {
    [type === 'up' ? 'upvotes' : 'downvotes']: increment(1),
  });
}


/* ════════════════════════════════════════
   Firestore — 독서록(diaries)
   문서 ID: "{uid}_{bookId}"
════════════════════════════════════════ */

/**
 * 독서록 저장 (없으면 생성, 있으면 덮어쓰기)
 * @param {string} bookId  books 컬렉션 문서 ID
 * @param {{ title, author, genre, keywords, content, rating }} data
 */
export async function saveDiary(bookId, data) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const entry = {
    uid:       user.uid,
    username:  user.displayName || user.email.split('@')[0],
    bookId:    String(bookId),
    title:     data.title    || '',
    author:    data.author   || '',
    genre:     data.genre    || '',
    keywords:  data.keywords || '',
    content:   data.content  || '',
    rating:    Number(data.rating) || 0,
    updatedAt: serverTimestamp(),
  };

  // thumbnail이 있을 때만 필드 추가 (null로 덮어쓰지 않음)
  if (data.thumbnail) entry.thumbnail = data.thumbnail;

  await setDoc(doc(db, 'diaries', `${user.uid}_${bookId}`), entry, { merge: true });
}

/**
 * 내 독서록 1개 조회
 * @param {string} bookId
 */
export async function getDiary(bookId) {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'diaries', `${user.uid}_${bookId}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * 내 독서록 전체 조회
 */
export async function getAllDiaries() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDocs(query(
    collection(db, 'diaries'),
    where('uid', '==', user.uid),
    orderBy('updatedAt', 'desc')
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * 독서록 삭제
 * @param {string} bookId
 */
export async function deleteDiary(bookId) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  await deleteDoc(doc(db, 'diaries', `${user.uid}_${bookId}`));
}


/* ════════════════════════════════════════
   Firestore — 독서목록(readingList)
   문서 ID: "{uid}_{bookId}"
   ※ where 단독 쿼리만 사용 (복합 인덱스 불필요)
     클라이언트에서 최신순 정렬
════════════════════════════════════════ */

/**
 * 독서 목록 전체 조회 (최신 추가순, 클라이언트 정렬)
 */
export async function getReadingList() {
  const user = auth.currentUser;
  console.log('[getReadingList] user:', user?.uid);
  if (!user) return [];

  try {
    const snap = await getDocs(query(
      collection(db, 'readingList'),
      where('uid', '==', user.uid)
    ));
    console.log('[getReadingList] snap.size:', snap.size);
    console.log('[getReadingList] docs:', snap.docs.map(d => d.data()));

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.addedAt?.seconds ?? 0;
        const tb = b.addedAt?.seconds ?? 0;
        return tb - ta;
      });
  } catch(e) {
    console.error('[getReadingList 오류]', e.code, e.message);
    return [];
  }
}

/**
 * 독서 목록에 작품 추가
 * @param {{ bookId, title, author, genre, thumbnail }} item
 */
export async function addToReadingList(item) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const bookIdStr = String(item.bookId);
  const docId     = `${user.uid}_${bookIdStr}`;

  await setDoc(doc(db, 'readingList', docId), {
    uid:        user.uid,
    bookId:     bookIdStr,
    title:      item.title  || '',
    author:     item.author || '',
    genre:      item.genre  || '',
    thumbnail:  item.thumbnail || '',
    bookmarked: false,
    addedAt:    serverTimestamp(),
  }, { merge: true });
}

/**
 * 독서 목록에서 삭제
 */
export async function removeFromReadingList(bookId) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  await deleteDoc(doc(db, 'readingList', `${user.uid}_${bookId}`));
}

/**
 * 북마크 토글
 * @param {string} docId   Firestore 문서 ID (uid_bookId 형태)
 * @param {boolean} current
 */
export async function toggleBookmark(docId, current) {
  await updateDoc(doc(db, 'readingList', docId), { bookmarked: !current });
}
/**
 * 💡 추가: 드래그 앤 드롭 후 정렬된 순서(rank)를 Firestore에 반영합니다.
 * @param {Array} orderedList - 변경된 순서대로 정렬된 리스트 배열
 */
export async function saveReadingOrder(orderedList) {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  // 대량 업데이트를 위해 Firestore 배치를 생성합니다.
  const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const batch = writeBatch(db);

  orderedList.forEach((item, index) => {
    // 각 아이템의 Firestore 문서 ID (uid_bookId 형태)
    const docRef = doc(db, 'readingList', item.id);
    batch.update(docRef, { rank: index });
  });

  await batch.commit();
  console.log('[순서 변경 성공] 모든 아이템의 rank가 업데이트되었습니다.');
}