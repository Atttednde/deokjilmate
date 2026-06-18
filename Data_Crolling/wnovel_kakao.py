import time
import random
import json
import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

url_list = [
    'https://page.kakao.com/menu/10011/screen/91',
    'https://page.kakao.com/menu/10011/screen/64',
    'https://page.kakao.com/menu/10011/screen/68',
    'https://page.kakao.com/menu/10011/screen/92',
    'https://page.kakao.com/menu/10011/screen/70',
]

os.makedirs("thumbnails", exist_ok=True)


def scroll_down():
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1.5)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def save_thumbnail_via_new_tab(img_url, filename):
    """
    표지 이미지를 새 탭으로 열어서 저장
    (카카오페이지 방식: 이미지 우클릭 → 새탭으로 열기 → 저장)
    """
    try:
        # 새 탭으로 이미지 URL 열기
        driver.execute_script(f"window.open('{img_url}', '_blank');")
        time.sleep(1.5)

        # 새 탭으로 포커스 이동
        driver.switch_to.window(driver.window_handles[-1])
        time.sleep(1)

        # 현재 탭의 이미지 src 가져오기 (blob 또는 직접 URL)
        current_url = driver.current_url

        # requests로 다운로드 시도
        cookies = {c['name']: c['value'] for c in driver.get_cookies()}
        headers = {
            "User-Agent": driver.execute_script("return navigator.userAgent"),
            "Referer": "https://page.kakao.com/",
        }
        resp = requests.get(current_url, headers=headers, cookies=cookies, timeout=10)
        if resp.status_code == 200:
            with open(filename, "wb") as f:
                f.write(resp.content)

        # 새 탭 닫고 원래 탭으로 복귀
        driver.close()
        driver.switch_to.window(driver.window_handles[0])
        return True

    except Exception as e:
        print(f"  표지 저장 실패: {e}")
        if len(driver.window_handles) > 1:
            driver.close()
            driver.switch_to.window(driver.window_handles[0])
        return False


def get_title(driver):
    """제목 추출: 여러 선택자 순차 시도"""
    selectors = [
        (By.CSS_SELECTOR, "[class*='font-large3-bold']"),
        (By.CSS_SELECTOR, "h1"),
        (By.CSS_SELECTOR, "[class*='title']"),
    ]
    for by, selector in selectors:
        try:
            elems = driver.find_elements(by, selector)
            for e in elems:
                txt = e.text.strip()
                if len(txt) > 1:
                    return txt
        except:
            continue
    return ""


def get_author(driver):
    """
    저자 추출
    - 클래스명에 공백이 있으면 CSS에서 복합 클래스로 처리해야 함
    - .font-small2.mb-6pxr 처럼 점(.)으로 연결
    """
    # 방법 1: 복합 CSS 클래스 선택자
    try:
        elems = driver.find_elements(
            By.CSS_SELECTOR,
            "[class*='font-small2'][class*='opacity-70']"
        )
        for e in elems:
            txt = e.text.strip()
            if 1 < len(txt) <= 30:
                return txt
    except:
        pass

    # 방법 2: XPath로 "글" 또는 "작가" 포함 텍스트 탐색
    try:
        elems = driver.find_elements(By.XPATH, "//*[contains(text(),'글') or contains(text(),'작가')]")
        for e in elems:
            txt = e.text.strip()
            if 1 < len(txt) <= 30:
                return txt
    except:
        pass

    return ""


def get_thumbnail_url(driver):
    """alt='썸네일' 인 첫 번째 img 태그의 src 반환"""
    try:
        img = driver.find_element(By.CSS_SELECTOR, "img[alt='썸네일']")
        src = img.get_attribute("src") or img.get_attribute("data-src") or ""
        return src
    except:
        pass
    return ""


# ✅ 1. 작품 링크 수집
novel_links = []

for url in url_list:
    driver.get(url)
    time.sleep(3)
    scroll_down()

    elements = driver.find_elements(By.TAG_NAME, "a")
    temp = []
    for e in elements:
        href = e.get_attribute("href")
        if href and "/content/" in href:
            temp.append(href)

    temp = list(set(temp))[:30]  # 테스트용 30개 
    novel_links.extend(temp)

# 중복 제거
novel_links = list(set(novel_links))
print("총 링크 수:", len(novel_links))


# ✅ 2. 상세 데이터 수집
results = []

for link in novel_links:
    try:
        driver.get(link)
        time.sleep(2.5)

        # --- 제목 ---
        title = get_title(driver)

        # --- 저자 ---
        author = get_author(driver)

        # --- 표지 URL 추출 ---
        thumbnail_url = get_thumbnail_url(driver)

        # --- 표지 저장 (새 탭으로 열어서 저장) ---
        thumbnail_path = ""
        if thumbnail_url:
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '_')).strip()[:30]
            filename = f"thumbnails/{safe_title or 'unknown'}.jpg"
            success = save_thumbnail_via_new_tab(thumbnail_url, filename)
            if success:
                thumbnail_path = filename
                # print(f"  표지 저장: {filename}")

        # --- 키워드 (about 탭) ---
        keywords = []
        try:
            driver.get(link + "?tab_type=about")
            time.sleep(2)
            spans = driver.find_elements(By.TAG_NAME, "span")
            for s in spans:
                text = s.text.strip()
                if text.startswith("#"):
                    keywords.append(text)
        except:
            pass

        results.append({
            "title": title,
            "author": author,
            "thumbnail_url": thumbnail_url,
            "thumbnail_path": thumbnail_path,
            "keywords": keywords,
            "url": link
        })

        # print(f"✅ 완료: {title} / {author} / 키워드 {len(keywords)}개")
        time.sleep(random.randint(2, 4))

    except Exception as e:
        print(f"❌ 실패: {link} → {e}")
        continue


# ✅ 3. JSON 저장
with open("kakao_novels.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n저장 완료: {len(results)}개")
driver.quit()