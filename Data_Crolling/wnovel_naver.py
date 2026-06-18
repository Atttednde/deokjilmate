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
url_list = [
     
    "https://series.naver.com/novel/categoryProductList.series?categoryTypeCode=genre&genreCode=207&orderTypeCode=sale&isFinished=false",  # 로판
    "https://series.naver.com/novel/categoryProductList.series?categoryTypeCode=genre&genreCode=202&orderTypeCode=sale&isFinished=false",  # 판타지
     
     
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
            "Referer": "https://series.naver.com/",
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
    """class='end_head' 안의 h2 태그에서 제목 추출"""
    try:
        end_head = driver.find_element(By.CLASS_NAME, "end_head")
        h2 = end_head.find_element(By.TAG_NAME, "h2")
        return h2.text.strip()
    except:
        return ""


def get_author(driver):
    """
    <li class="info_lst"> 안에서
    span 텍스트가 '글'인 항목의 다음 <a> 태그 텍스트 추출
    """
    try:
        info_items = driver.find_elements(By.CSS_SELECTOR, "li.info_lst")
        for item in info_items:
            spans = item.find_elements(By.TAG_NAME, "span")
            for span in spans:
                if span.text.strip() == "글":
                    a_tag = span.find_element(
                        By.XPATH, "following-sibling::a[1]"
                    )
                    return a_tag.text.strip()
    except:
        pass
    return ""


def get_thumbnail_url(driver):
    """<a class='pic_area'> 안의 첫 번째 img src 반환"""
    try:
        a = driver.find_element(By.CSS_SELECTOR, "a.pic_area")
        img = a.find_element(By.TAG_NAME, "img")
        src = img.get_attribute("src") or img.get_attribute("data-src") or ""
        return src
    except:
        pass
    return ""


def get_keywords(driver):
    """
    <li class="info_lst"> 안에서
    span 텍스트가 '글'인 항목의 다음 <a> 태그 텍스트 추출
    """
    try:
        info_items = driver.find_elements(By.CSS_SELECTOR, "li.info_lst")
        for item in info_items:
            spans = item.find_elements(By.TAG_NAME, "span")
            for span in spans:
                if span.text.strip() == "글":
                    a_tag = item.find_element(By.TAG_NAME, "a")
                    return a_tag.text.strip()
    except:
        pass
    return ""


# ✅ 1. 작품 링크 수집
novel_links = []

for base_url in url_list:
    for page in range(1, TOTAL_PAGES + 1):
        url = f"{base_url}&page={page}"
        driver.get(url)
        time.sleep(2.5)

        elements = driver.find_elements(By.TAG_NAME, "a")
        for e in elements:
            href = e.get_attribute("href")
            if href and "/novel/detail.series" in href:
                novel_links.append(href)

        print(f"[{url}] 페이지 {page} 완료, 누적 링크: {len(novel_links)}개")

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
                print(f"  표지 저장: {filename}")

        #키워드
        keywords = get_keywords(driver)

        results.append({
            "title": title,
            "author": author,
            "thumbnail_url": thumbnail_url,
            "thumbnail_path": f"thumbnails/{title or 'unknown'}.jpg",
            "keywords": keywords,
            "url": link
        })

        # print(f"✅ 완료: {title} / {author} / 키워드 {len(keywords)}개")
        time.sleep(random.randint(2, 4))

    except Exception as e:
        print(f"❌ 실패: {link} → {e}")
        continue


#✅ 3. JSON 저장
with open("naver_novels.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\n저장 완료: {len(results)}개")
driver.quit()