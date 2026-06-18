# 덕질메이트 (Deokjilmate)

웹툰/웹소설 팬을 위한 작품 검색·리뷰·독서 관리 웹 플랫폼입니다. 사용자는 작품을 검색하고, 태그로 필터링하고, 리뷰를 남기고, 독서 목록과 독서록을 관리할 수 있습니다.

## 주요 기능

- 이메일/비밀번호 및 Google 로그인 (Firebase Auth)
- 웹툰/웹소설 작품 검색 및 태그(장르, 배경, 인물, 분위기) 기반 필터링
- 작품 상세 페이지 및 리뷰 작성/조회
- 독서 목록(읽고 싶은 작품) 관리
- 독서록(읽은 기록) 작성 및 조회
- 내가 남긴 리뷰 모아보기

## 기술 스택

- Frontend: HTML, CSS, JavaScript (ES Modules)
- Backend: Firebase Authentication, Cloud Firestore
- 데이터 수집: Node.js, KMAS(한국만화영상진흥원) OpenAPI

## 폴더 구조

```
project/
├── index.html              # 메인 페이지
├── login.html               # 로그인
├── signup.html               # 회원가입
├── search.html               # 웹소설 검색
├── search_webtoon.html       # 웹툰 검색
├── detail.html               # 작품 상세 페이지
├── booklist.html              # 독서 목록
├── diary.html                 # 독서록
├── myreviews.html              # 내가 남긴 리뷰
├── common.css                  # 공통 스타일
├── data.js                      # Firestore 데이터 조회/저장 함수 모음
├── auth.js                       # 인증 관련 함수 모음
├── firebase-config.js             # Firebase 브라우저(클라이언트) SDK 설정
├── firebase-admin-config.js        # Firebase Admin SDK 설정 (Node.js 스크립트용)
├── fetch-kmas-data.js               # KMAS OpenAPI에서 웹툰 데이터를 가져와 Firestore에 저장하는 수집 스크립트
├── upload_books.js                   # 웹소설(books) 데이터 Firestore 업로드 스크립트
├── upload_webtoons.js                 # 웹툰(webtoons) 데이터 Firestore 업로드 스크립트
├── analyze-tags.js                     # 태그 데이터 분석용 스크립트
├── webtoon_update.ts                    # 웹툰 데이터 갱신용 스크립트
├── wnovel_data(1).json                   # 웹소설 원본 데이터(크롤링)
└── package.json
```

## 실행 방법

### 1. 사전 준비

- Node.js 설치
- Firebase 프로젝트 생성 (Firebase 콘솔)

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 설정 (민감 정보 파일 직접 생성 필요)

본 저장소에는 보안을 위해 아래 파일들이 포함되어 있지 않습니다. 직접 발급받아 프로젝트 루트에 추가해야 합니다.

- **firebase-config.js**: Firebase 콘솔 → 프로젝트 설정 → 일반 → 내 앱에서 SDK 설정값을 복사하여 작성
- **serviceAccountKey.json**: Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성으로 다운로드 후, 프로젝트 루트에 저장 (`firebase-admin-config.js`가 이 파일을 참조함)

### 4. 웹사이트 실행

`index.html`을 브라우저로 열거나, VS Code Live Server 등으로 실행합니다.

### 5. 데이터 수집 스크립트 실행 (선택)

KMAS OpenAPI로부터 웹툰 데이터를 수집하려면:

```bash
node fetch-kmas-data.js
```

KMAS OpenAPI 인증키는 한국만화영상진흥원에서 별도로 신청 후 발급받아 코드 내 `AUTH_KEY` 값에 입력해야 합니다.

## 데이터베이스 구조 (Firestore)

- `books`: 웹소설 작품 정보
- `webtoons`: 웹툰 작품 정보 (KMAS OpenAPI로 수집)
- `reviews`: 사용자 리뷰
- `readingList`: 독서 목록
- `diaries`: 독서록
