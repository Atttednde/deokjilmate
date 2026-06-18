import fetch from 'node-fetch';
import { db } from './firebase-admin-config.js';

const AUTH_KEY = "2a3ee8a77d7eadf6bdff9c778efe8486"; 
const API_URL = "https://www.kmas.or.kr/openapi/search/bookAndWebtoonList";
const MAX_TOTAL = 100;

const SEARCH_QUERIES = [
  '가','나','다','라','마','바','사','아','자','차','카','타','파','하',
  '은','는','이','을','를','의','와','과','도','로','에',
  '1','2','3','4','5','6','7','8','9','0',
  'a','b','c','d','e','f','g','h','i','j','k','l','m',
  'n','o','p','q','r','s','t','u','v','w','x','y','z'
];

const savedIds = new Set();    // 문서 ID 중복 방지
const savedTitles = new Set(); // prdctNm 기준 제목 중복 방지

async function fetchByQuery(query, remaining) {
  let page = 1;
  let totalSaved = 0;

  while (true) {
    try {
      const requestUrl = `${API_URL}?prvKey=${AUTH_KEY}&viewItemCnt=100&pageNo=${page}&title=${encodeURIComponent(query)}`;
      
      const response = await fetch(requestUrl);
      if (!response.ok) throw new Error(`API 요청 실패 (Status: ${response.status})`);

      const json = await response.json();
      if (json.result?.resultState !== 'success') break;

      const items = json.itemList || [];
      if (items.length === 0) break;

      for (const item of items) {
        if (savedIds.size >= MAX_TOTAL) return totalSaved;

        // 플랫폼명 없는 작품 제외
        const platformName = item.pltfomCdNm || '';
        if (!platformName) continue;

        // prdctNm 기준으로 중복 제외 (권수 다른 같은 작품 제외)
        const prdctNm = item.prdctNm || '';
        if (!prdctNm) continue;
        if (savedTitles.has(prdctNm)) continue;

        const itemSequence = item.prdctUnqNum || item.isbn;
        if (!itemSequence) continue;
        if (savedIds.has(String(itemSequence))) continue;

        const pictureWriter  = (item.pictrWritrNm || '').replace(/\s*그림\s*$/, '').trim();
        const sentenceWriter = (item.sntncWritrNm || '').replace(/\s*글\s*$/, '').trim();
        const genreTag       = item.mainGenreCdNm || '';
        const thumbnailUrl   = item.imageDownloadUrl || '';

        let authorResult = '';
        if (sentenceWriter && pictureWriter) {
          authorResult = sentenceWriter === pictureWriter
            ? sentenceWriter
            : `${sentenceWriter}(글), ${pictureWriter}(그림)`;
        } else {
          authorResult = sentenceWriter || pictureWriter || '작가 미상';
        }

        await db.collection('webtoons').doc(String(itemSequence)).set({
          title:     prdctNm.trim(),
          author:    authorResult,
          genre:     '웹툰',
          tags:      genreTag ? [genreTag.trim()] : [],
          platforms: [platformName.trim()],
          thumbnail: thumbnailUrl.trim(),
          source:    'KMAS_API'
        }, { merge: true });

        savedIds.add(String(itemSequence));
        savedTitles.add(prdctNm);
        totalSaved++;
      }

      const totalCount = json.result?.totalCount || 0;
      if (page * 100 >= totalCount) break;

      page++;
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ [${query} / ${page}페이지] 오류:`, error.message);
      break;
    }
  }

  return totalSaved;
}

async function startMigration() {
  console.log('🚀 KMAS OpenAPI ➡️ Firestore [webtoons] 수집 시작...');

  for (const query of SEARCH_QUERIES) {
    if (savedIds.size >= MAX_TOTAL) break;

    const remaining = MAX_TOTAL - savedIds.size;
    const count = await fetchByQuery(query, remaining);

    if (count > 0) {
      console.log(`✅ "${query}" → ${count}개 저장 (누적: ${savedIds.size}개)`);
    }

    await new Promise(resolve => setTimeout(resolve, 400));
  }

  console.log(`\n🏁 수집 완료! 총 ${savedIds.size}개 작품이 저장되었습니다.`);
}

startMigration();