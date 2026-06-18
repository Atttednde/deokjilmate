// upload_webtoons.js
console.log("1. 스크립트 로드 시작");

// 💡 firebase-admin에서 필요한 기능(initializeApp, cert)을 각각 직접 가져옵니다.
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
// const admin = require('firebase-admin'); // FieldValue.serverTimestamp()용으로 남겨둠
const fetch = require('node-fetch');
const serviceAccount = require('./apiserviceAccountKey.json');

console.log("2. 모듈 로드 완료");

// 💡 최신 문법 구조로 안전하게 초기화합니다.
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
console.log("3. 파이어베이스 초기화 완료");

const BASE_URL = 'http://localhost:3000';
const PROVIDERS = ['NAVER', 'KAKAO', 'KAKAO_PAGE'];
const LIMIT     = 100;   // 한 번에 가져올 개수 (최대 100 권장)

/* API 응답 → Firebase webtoons 필드로 변환 */
function transform(w) {
  // provider별 플랫폼 이름 한글화
  const platformMap = {
    NAVER:      '네이버웹툰',
    KAKAO:      '카카오웹툰',
    KAKAO_PAGE: '카카오페이지',
  };

  return {
    title:      w.title     || '',
    author:     Array.isArray(w.author) ? w.author.join(', ') : (w.author || ''),
    // 💡 새로운 webtoons 컬렉션이므로 genre 필드도 원본 장르의 첫 번째 값을 넣거나 기본값 처리
    genre:      Array.isArray(w.genres) && w.genres.length > 0 ? w.genres[0] : '웹툰', 
    genres:     w.genres    || [],               // 원본 장르 배열 보존
    tags:       w.genres    || [],               // 태그 검색용 (genres 재활용)
    platforms:  [platformMap[w.provider] || w.provider],
    provider:   w.provider  || '',
    thumbnail:  Array.isArray(w.thumbnail) ? (w.thumbnail[0] || '') : (w.thumbnail || ''),
    url:        w.url       || '',
    isEnd:      w.isEnd     ?? false,
    isFree:     w.isFree    ?? true,
    isUpdated:  w.isUpdated ?? false,
    updateDays: w.updateDays || [],
    ageGrade:   w.ageGrade  || 0,
    sourceId:   w._id       || '',              // 원본 API id (중복 방지용)
    rating:     0,                              // 초기 별점 0
    avgRating:  null,
    reviewCount: 0,
    createdAt:  Timestamp.now(),
    updatedAt:  Timestamp.now(),
  };
}

/* 특정 provider의 전체 페이지 수집 */
async function fetchAllByProvider(provider) {
  let page = 0;
  const all = [];

  while (true) {
    const url = `${BASE_URL}/webtoons?page=${page}&limit=${LIMIT}&provider=${provider}`;
    console.log(`  GET ${url}`);

    const res  = await fetch(url);
    if (!res.ok) {
      console.error(`  ❌ ${provider} page=${page} 실패 (${res.status})`);
      break;
    }

    const json     = await res.json();
    const webtoons = json.webtoons || [];
    if (!webtoons.length) break;

    all.push(...webtoons);
    console.log(`  ✅ ${provider} page=${page} | ${webtoons.length}개 (누적 ${all.length})`);

    if (page >= (json.lastPage ?? 0)) break;
    page++;

    // 서버 부하 방지: 요청 사이 0.5초 대기
    await new Promise(r => setTimeout(r, 500));
  }

  return all;
}

/* Firestore에 500개씩 batch 업로드 */
async function uploadToFirestore(webtoons) {
  console.log("\n기존 수집 데이터 확인 중...");
  
  // 💡 1. 중복 체크 대상을 새로운 'webtoons' 컬렉션으로 변경합니다.
  const existingSnap = await db.collection('webtoons').get();
  const existingIds  = new Set(
    existingSnap.docs.map(d => d.data().sourceId).filter(Boolean)
  );

  const toUpload = webtoons.filter(w => !existingIds.has(w._id));
  console.log(`전체 ${webtoons.length}개 중 신규 ${toUpload.length}개 업로드 시작`);

  // 500개씩 나눠서 batch commit
  const chunks = [];
  for (let i = 0; i < toUpload.length; i += 500) {
    chunks.push(toUpload.slice(i, i + 500));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const batch = db.batch();
    chunks[ci].forEach(w => {
      // 💡 2. 데이터를 저장할 컬렉션 위치를 'webtoons'로 변경합니다.
      const ref = db.collection('webtoons').doc();  // 자동 생성 ID
      batch.set(ref, transform(w));
    });
    await batch.commit();
    console.log(`  batch ${ci + 1}/${chunks.length} 완료 (${chunks[ci].length}개)`);
  }
}

/* 메인 실행 */
async function main() {
  console.log('\n=== 🚀 웹툰 데이터 Firebase 업로드 시작 ===');
  const all = [];

  for (const provider of PROVIDERS) {
    console.log(`\n[${provider}] 수집 시작...`);
    const webtoons = await fetchAllByProvider(provider);
    all.push(...webtoons);
  }

  console.log(`\n총 ${all.length}개 수집 완료`);
  await uploadToFirestore(all);
  console.log('\n✅ 모든 데이터가 webtoons 컬렉션에 업로드되었습니다!');
}

console.log("5. main() 호출 직전");
main()
  .then(() => {
    console.log("프로그램이 정상적으로 종료되었습니다.");
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ 실행 중 치명적인 오류 발생:', e);
    process.exit(1);
  });