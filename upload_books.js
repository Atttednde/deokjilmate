const admin = require('firebase-admin');
const books = require('./wnovel_data(1).json'); // 크롤링한 파일

// Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function upload() {
  const batch = db.batch(); // 한 번에 최대 500개
  
  books.forEach((book, i) => {
    const ref = db.collection('books').doc(); // 자동 ID
    batch.set(ref, {
      title:      book.title     || '',
      author:     book.author    || '',
      genre:      book.genre     || '',        // '웹툰' | '웹소설'
      tags:       book.tags      || [],
      platforms:  book.platforms || [],
      rating:     book.rating    || 0,
      thumbnail:  book.thumbnail || '',
      createdAt:  admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`✅ ${books.length}개 업로드 완료`);
}

upload().catch(console.error);