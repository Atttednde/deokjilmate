import { db } from './firebase-admin-config.js';

// 태그 카운트 결과를 이쁘게 정렬하고 출력해주는 헬퍼 함수
function processAndLogTags(tagCounter, typeName) {
  const sortedTags = Object.entries(tagCounter).sort((a, b) => b[1] - a[1]);
  
  console.log(`\n======================================================`);
  console.log(`📊 [${typeName}] 실제 존재하는 고유 태그 수: ${sortedTags.length}개`);
  console.log(`======================================================`);
  
  if (sortedTags.length === 0) {
    console.log('❌ 등록된 태그가 없습니다.');
    return;
  }

  console.log(`👇 [${typeName}] 태그 목록 및 쓰인 횟수 (많이 쓰인 순)`);
  console.log(JSON.stringify(Object.fromEntries(sortedTags), null, 2));
}

// 특정 데이터를 받아와서 태그 카운터 객체에 누적해주는 헬퍼 함수
function parseSnapshotTags(snapshot, tagCounter) {
  let count = 0;
  snapshot.forEach((doc) => {
    count++;
    const data = doc.data();
    const tags = data.tags || [];
    const tagsArray = Array.isArray(tags) ? tags : [tags];

    tagsArray.forEach((tag) => {
      if (!tag) return;
      const trimmed = tag.trim();
      if (trimmed === '') return;
      tagCounter[trimmed] = (tagCounter[trimmed] || 0) + 1;
    });
  });
  return count;
}

async function analyzeBothCollections() {
  console.log('🔍 파이어베이스 어드민 권한으로 [webtoons] 및 [books] 컬렉션을 분석 중입니다...');
  
  try {
    // 1. webtoons 컬렉션 (웹툰) 데이터 가져오기
    const webtoonSnapshot = await db.collection('webtoons').get();
    const webtoonTagCounter = {};
    const webtoonCount = parseSnapshotTags(webtoonSnapshot, webtoonTagCounter);

    // 2. books 컬렉션 (웹소설) 데이터 가져오기
    const novelSnapshot = await db.collection('books').get();
    const novelTagCounter = {};
    const novelCount = parseSnapshotTags(novelSnapshot, novelTagCounter);

    // 3. 결과 대시보드 출력
    console.log(`\n✅ 분석 완료!`);
    console.log(`- [webtoons] 컬렉션에서 조사된 웹툰 작품 수: ${webtoonCount}개`);
    console.log(`- [books] 컬렉션에서 조사된 웹소설 작품 수: ${novelCount}개`);

    // 4. 각각 분리해서 태그 리포트 출력
    processAndLogTags(webtoonTagCounter, '🎬 웹툰 전용 태그 (webtoons 컬렉션)');
    processAndLogTags(novelTagCounter, '📚 웹소설 전용 태그 (books 컬렉션)');

  } catch (error) {
    console.error('❌ 컬렉션 통합 분석 중 오류 발생:', error);
  }
}

analyzeBothCollections();