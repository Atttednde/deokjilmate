import time
import random
import json
import os
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

# ✅ 수집할 URL 목록 및 페이지 범위 설정
#한 페이지당 작품 60개 
url_list = [
    "https://ridibooks.com/category/6050?tab=bestsellers&category=6050&adult_exclude=y&page=1", #로판 성인제외
    # "https://ridibooks.com/category/1650", #로맨스
    # "https://ridibooks.com/category/1752", #(퓨전)판타지
    # "https://ridibooks.com/category/1753", #현판
    # "https://ridibooks.com/category/1754" #무협 

]

TOTAL_PAGES = 1  # 장르별 수집할 페이지 수

 

os.makedirs("thumbnails", exist_ok=True)


def save_thumbnail_via_new_tab(img_url, filename):
    """이미지를 새 탭으로 열어서 저장"""
    try:
        driver.execute_script(f"window.open('{img_url}', '_blank');")
        time.sleep(1.5)
        driver.switch_to.window(driver.window_handles[-1])
        time.sleep(1)

        current_url = driver.current_url
        cookies = {c['name']: c['value'] for c in driver.get_cookies()}
        headers = {
            "User-Agent": driver.execute_script("return navigator.userAgent"),
            "Referer": "https://ridibooks.com/",
        }
        resp = requests.get(current_url, headers=headers, cookies=cookies, timeout=10)
        if resp.status_code == 200:
            with open(filename, "wb") as f:
                f.write(resp.content)

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
    """h1 태그에서 제목 추출"""
    try:
        h1 = driver.find_element(By.TAG_NAME, "h1")
        return h1.text.strip()
    except:
        return ""


def get_author(driver):
    try:
        divs = driver.find_elements(By.TAG_NAME, "div")
        for div in divs:
            if "저자" in div.text:
                a_tag = div.find_element(By.TAG_NAME, "a")
                return a_tag.text.strip()
    except:
        pass
    return ""


def get_thumbnail_url(driver):
    try:
        span = driver.find_element(By.CSS_SELECTOR, "span.rigrid-1jp7wo9.e1ftn9sh1")
        img = span.find_element(By.TAG_NAME, "img")
        return img.get_attribute("src") or img.get_attribute("data-src") or ""
    except:
        pass
    return ""


def get_keywords(driver):
    keywords = []
    try:
        spans = driver.find_elements(By.TAG_NAME, "span")
        for s in spans:
            text = s.text.strip()
            if text.startswith("#") and len(text) > 1:
                keywords.append(text)
    except:
        pass
    return keywords


# ✅ 1. 작품 링크 수집
novel_links = []

for base_url in url_list:
    driver.get(base_url)
    time.sleep(2.5)

    elements = driver.find_elements(By.TAG_NAME, "a")
    temp = []
    for e in elements:
        href = e.get_attribute("href")
        if href and "/books/" in href:  # 리디 작품 링크 패턴
            temp.append(href)

    temp = list(set(temp))[:20]  # 장르당 20개 제한
    novel_links.extend(temp)

    print(f"[{base_url}] 페이지 완료, 누적 링크: {len(novel_links)}개")

# 중복 제거
novel_links = list(set(novel_links))
print(f"\n총 링크 수: {len(novel_links)}")


# ✅ 2. 상세 데이터 수집
results = []

for link in novel_links:
    try:
        driver.get(link)
        time.sleep(2.5)

        # 제목
        title = get_title(driver)

        # 저자
        author = get_author(driver)

        # 표지 URL
        thumbnail_url = get_thumbnail_url(driver)

        # 표지 저장 (새 탭으로 열어서 저장)
        thumbnail_path = ""
        if thumbnail_url:
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '_')).strip()[:30]
            filename = f"thumbnails/{safe_title or 'unknown'}.jpg"
            success = save_thumbnail_via_new_tab(thumbnail_url, filename)
            if success:
                thumbnail_path = filename
                

        # 키워드
        keywords = get_keywords(driver)

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
with open("ridi_novels.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n저장 완료: {len(results)}개")
driver.quit()