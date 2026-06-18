from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.select import Select
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import StaleElementReferenceException

driver = webdriver.Chrome() 


url_list = [
    'https://page.kakao.com/menu/10011/screen/91', # 판타지
    'https://page.kakao.com/menu/10011/screen/64', # 현판
    'https://page.kakao.com/menu/10011/screen/68', # 로맨스
    'https://page.kakao.com/menu/10011/screen/92', # 로판
    'https://page.kakao.com/menu/10011/screen/70', # 무협
]
# kakao_url = 'https://page.kakao.com/menu/11/screen/37?subcategory_uid=0'
f = open('해당 장르 이름.txt', 'w')
for url in url_list:
    driver.get(url)
    time.sleep(.5)


def scroll_down():
#스크롤 내리기 이동 전 위치
    scroll_location = driver.execute_script("return document.body.scrollHeight")

    while True:
	    #현재 스크롤의 가장 아래로 내림
	    driver.execute_script("window.scrollTo(0,document.body.scrollHeight)")
		
	    #전체 스크롤이 늘어날 때까지 대기
		time.sleep(1)
		
	    #늘어난 스크롤 높이
	    croll_height = driver.execute_script("return document.body.scrollHeight")

	    #늘어난 스크롤 위치와 이동 전 위치 같으면(더 이상 스크롤이 늘어나지 않으면) 종료
	    if scroll_location == scroll_height:
		    break
			
	    #같지 않으면 스크롤 위치 값을 수정하여 같아질 때까지 반복
	    else:
		    #스크롤 위치값을 수정
		    scroll_location = driver.execute_script("return document.body.scrollHeight")

#페이지 정보 가져오기 
scroll_down()
time.sleep(10)
source = driver.page_source
    
time.sleep(120)
soup = BeautifulSoup(source, 'html.parser')
# 소설 전체 목록
novel_list = soup.select('#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div > div.flex.grow.flex-col > div.flex.grow.flex-col > div > div.flex.grow.flex-col.py-10pxr.px-15pxr > div > div > div > div')
time.sleep(120)


#소설 페이지 링크 파일로 저장
cnt = 0
# 소설 페이지 링크 가져오기
for novel in novel_list:
    href_url = novel.find('a')['href']
    novel_href.append(href_url)
    print(href_url, file=f)
    cnt += 1
print(cnt)
f.close()

# 카카오 페이지 들어가서 정보 가져오기
kakao = 'https://page.kakao.com'

kakao_url_list = []
novel_name = []
novel_genre = []
novel_author = []
novel_intro = []

# 리스트 파일 위치
f = open('D:\download\카카오 소설 페이지 리스트\로맨스.txt', 'r')
lines = f.readlines()
for line in lines:
    line = line.strip()
    kakao_url_list.append(kakao+line)

f.close()

# 파일에서 링크 읽어서 정보 가져오기
for novel_href in kakao_url_list:
    # 소설 하나 페이지 들어가기
    driver.get(novel_href)
    time.sleep(.5)  
    pass_novel = driver.find_element(By.CSS_SELECTOR,'#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div > div').text
    if '로그인 후 이용해 주세요' in pass_novel:
         pass
    else: 
	    # 소설 제목
        novel_name.append(driver.find_element(By.CSS_SELECTOR, '#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div.flex.h-full.flex-1 > div.mb-28pxr.flex.w-320pxr.flex-col > div:nth-child(1) > div.w-320pxr.css-0 > div > div.css-0 > div.relative.text-center.mx-32pxr.py-24pxr > span').text)
        # 소설 장르
        novel_genre.append(driver.find_element(By.CSS_SELECTOR, '#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div.flex.h-full.flex-1 > div.mb-28pxr.flex.w-320pxr.flex-col > div:nth-child(1) > div.w-320pxr.css-0 > div > div.css-0 > div.relative.text-center.mx-32pxr.py-24pxr > div.all-child\:font-small2.mt-16pxr.flex.items-center.justify-center.text-el-60 > span:nth-child(9)').text)
        # 소설 작가
        novel_author.append(driver.find_element(By.CSS_SELECTOR, '#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div.flex.h-full.flex-1 > div.mb-28pxr.flex.w-320pxr.flex-col > div:nth-child(1) > div.w-320pxr.css-0 > div > div.css-0 > div.relative.text-center.mx-32pxr.py-24pxr > div.flex.items-center.justify-center.all-child\:font-small2.mt-4pxr.flex-col.text-el-50.opacity-100 > div.mt-4pxr').text)

        # 작품 소개 버튼
        driver.find_element(By.CSS_SELECTOR,'#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div.flex.h-full.flex-1 > div.mb-28pxr.ml-4px.flex.w-632pxr.flex-col > div.relative.flex.w-full.flex-col.my-0.bg-bg-a-20.px-15pxr.pt-28pxr.pb-12pxr > div > div > div:nth-child(2) > a > div > div > span').click()
        # 작품 소개
        novel_intro.append(driver.find_element(By.CSS_SELECTOR, '#__next > div > div.flex.w-full.grow.flex-col.px-122pxr > div.flex.h-full.flex-1 > div.mb-28pxr.ml-4px.flex.w-632pxr.flex-col > div.flex-1.bg-bg-a-20 > div.text-el-60.break-keep.py-20pxr.pt-31pxr.pb-32pxr > span').text.replace('\n', ' ').replace('  ',' '))

    random_time_sleep = random.randint(2,10)
    time.sleep(random_time_sleep)


novel_data = {
    'title': novel_name,
    'author': novel_author,
    'intro': novel_intro,
    'genre': novel_genre
}