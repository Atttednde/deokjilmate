import json, os

with open('D:\web2026\project\Data_Crolling\kaka0_novels.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

# os.makedirs('/tmp/output', exist_ok=True)

def extract_genre(keywords):
    """keywords에서 장르 추론 (로판, 판타지, 현대 등)"""
    genre_map = {
        '로판': '로맨스판타지', '판타지물': '판타지', '현대물': '현대',
        '무협': '무협', 'SF': 'SF', '학원물': '학원',
    }
    for kw in keywords:
        clean = kw.lstrip('#')
        for key, val in genre_map.items():
            if key in clean:
                return val
    return '웹소설'

def extract_tags(keywords):
    """# 중복 제거 + # 제거 + 메타 태그 제외"""
    exclude = {'기다리면무료','별점1000개이상','리뷰1000개이상','평점4점이상',
               '연재완결','연재중','웹툰원작','웹소설원작'}
    seen, tags = set(), []
    for kw in keywords:
        clean = kw.lstrip('#').strip()
        if clean and clean not in seen and clean not in exclude:
            seen.add(clean)
            tags.append(clean)
    return tags

converted = []
for item in raw:
    # index 항목(카테고리 헤더) 제외
    if not item['title'] or item['author'] == '' or item['title'].endswith('전체'):
        continue

    tags = extract_tags(item.get('keywords', []))
    genre = extract_genre(item.get('keywords', []))

    converted.append({
        "title":     item['title'],
        "author":    item['author'],   # 실제 작가명이 없어 크롤링 원본 그대로
        "genre":     genre,
        "tags":      tags,
        "platforms": ["카카오페이지"],
        "rating":    None,             # 원본에 rating 없음 → None 처리
        "thumbnail": item.get('thumbnail_url', '')
    })

with open('wnovel_data.json', 'w', encoding='utf-8') as f:
    json.dump(converted, f, ensure_ascii=False, indent=2)

print(f"변환 완료: {len(converted)}개 항목")
print(json.dumps(converted[0], ensure_ascii=False, indent=2))    