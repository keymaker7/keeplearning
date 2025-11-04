# 현재 프로젝트 상황 정리

## 📋 프로젝트 개요

**프로젝트명**: 학생평가 시스템 (HaksaengPyeongga)
**목적**: 초등학교 5학년 7반 학생들의 학습 기록 관리 및 AI 기반 평가 생성 시스템

## 🏗️ 현재 기술 스택

### 프론트엔드
- ✅ React 18.3.1 + TypeScript
- ✅ Vite 5.4.19 (빌드 도구)
- ✅ Radix UI + shadcn/ui (컴포넌트 라이브러리)
- ✅ Tailwind CSS (스타일링)
- ✅ TanStack Query (서버 상태 관리)
- ✅ Wouter (라우팅)
- ✅ React Hook Form + Zod (폼 관리 및 검증)

### 백엔드
- ✅ Express.js 4.21.2 + TypeScript
- ✅ PostgreSQL (Neon Database - 서버리스)
- ✅ Drizzle ORM 0.39.1 (타입 안전 DB 작업)
- ✅ Passport.js (인증)
- ✅ Express Session (세션 관리)
- ✅ Multer (파일 업로드)

### AI/외부 서비스
- ✅ OpenAI API (GPT-5 모델)
- ✅ PDF 파싱 (pdf-parse)

## 📁 프로젝트 구조

```
HaksaengPyeongga/
├── client/                    # React 프론트엔드
│   ├── src/
│   │   ├── components/        # UI 컴포넌트
│   │   │   ├── student-dashboard.tsx
│   │   │   ├── teacher-dashboard.tsx
│   │   │   └── ui/           # shadcn/ui 컴포넌트들
│   │   ├── pages/            # 페이지 컴포넌트
│   │   │   ├── auth-page.tsx
│   │   │   ├── home-page.tsx
│   │   │   └── not-found.tsx
│   │   ├── hooks/            # 커스텀 훅
│   │   │   ├── use-auth.tsx
│   │   │   └── use-mobile.tsx
│   │   └── lib/              # 유틸리티
│   └── index.html
├── server/                    # Express 백엔드
│   ├── index.ts              # 서버 진입점
│   ├── routes.ts             # API 라우트 정의
│   ├── auth.ts               # 인증 미들웨어
│   ├── db.ts                 # DB 연결 설정
│   ├── storage.ts            # DB 작업 함수들
│   ├── openai.ts             # OpenAI 통합
│   └── vite.ts               # Vite 개발 서버 설정
├── shared/                    # 공유 코드
│   └── schema.ts             # Drizzle ORM 스키마
├── uploads/                   # 업로드된 파일 저장소
├── attached_assets/           # 첨부된 자산 파일들
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── tailwind.config.ts
```

## ✨ 주요 기능

### 1. 사용자 관리
- ✅ 교사/학생 역할 기반 인증
- ✅ 세션 기반 로그인
- ✅ 비밀번호 해싱 (scrypt)
- ✅ 학생 일괄 생성
- ✅ 비밀번호 초기화

### 2. 학생 관리 (교사)
- ✅ 학생 목록 조회
- ✅ 학생 등록/수정/삭제
- ✅ 학생 정보 관리

### 3. 주간 학습 자료 관리 (교사)
- ✅ PDF 파일 업로드
- ✅ 주차별 자료 관리
- ✅ 시간표 정보 저장
- ✅ PDF 내용 추출 (구현 예정)

### 4. 학습 기록 (학생)
- ✅ 학습 내용 기록
- ✅ 학습 소감 기록
- ✅ 주차별/요일별 기록 조회
- ✅ 과목별 분류

### 5. 평가 생성 (교사)
- ✅ OpenAI GPT 기반 자동 평가 생성
- ✅ 과목별 평가 생성
- ✅ 평가 수정/삭제
- ✅ 평가 조회

### 6. 대시보드
- ✅ 교사 대시보드 (통계, 학생 관리)
- ✅ 학생 대시보드 (학습 기록)

## 🔧 개발 환경 설정

### 필요한 환경 변수
```env
DATABASE_URL=postgresql://...  # Neon Database 연결 문자열
OPENAI_API_KEY=sk-...          # OpenAI API 키
PORT=5000                      # 서버 포트 (기본값: 5000)
SESSION_SECRET=...             # 세션 암호화 키
```

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start

# 타입 체크
npm run check

# 데이터베이스 마이그레이션
npm run db:push
```

## 📊 데이터베이스 스키마

### 테이블 구조
1. **users**: 사용자 계정 (교사/학생)
2. **students**: 학생 프로필 정보
3. **weekly_materials**: 주간 학습 자료
4. **learning_records**: 학생 학습 기록
5. **evaluations**: AI 생성 평가

## 🚀 배포 상태

- ❌ GitHub 저장소 미생성
- ❌ 배포 환경 미설정
- ✅ 로컬 개발 환경 구성 완료

## 📝 Streamlit 전환 관련

### 현재 상황
프로젝트는 **Express.js + React** 풀스택 애플리케이션입니다.

### Streamlit 전환 시 고려사항
1. **기술 스택 변경 필요**: TypeScript/JavaScript → Python
2. **전체 코드 재작성 필요**: 수백 시간 소요 예상
3. **UI 기능 제한**: Streamlit의 제한된 커스터마이징
4. **복잡한 인증/권한 관리 어려움**: Streamlit Session State 제한

### 권장 사항
- ✅ 현재 Express + React 구성을 유지
- ✅ Streamlit을 별도 분석 도구로 활용 고려
- ✅ 또는 핵심 기능만 Streamlit으로 프로토타입 제작

자세한 내용은 `STREAMLIT_MIGRATION.md` 참조

## 📌 다음 단계

### GitHub 업로드
1. GitHub 저장소 생성
2. `.gitignore` 확인 (환경 변수, 업로드 파일 제외)
3. 초기 커밋 및 푸시
4. README.md 작성 완료 ✅

### Streamlit 전환 (선택)
1. 전환 방식 결정 (완전 전환 / 하이브리드 / 프로토타입)
2. Python 환경 설정
3. 핵심 기능부터 단계적 전환

## 🔍 현재 코드 상태

### 완성도
- ✅ 기본 인증 시스템 구현 완료
- ✅ 학생 관리 기능 구현 완료
- ✅ 학습 기록 기능 구현 완료
- ✅ 평가 생성 기능 구현 완료
- ⚠️ PDF 파싱 기능 부분 구현 (추가 작업 필요)
- ✅ UI 컴포넌트 구현 완료

### 주요 파일
- `server/routes.ts`: 모든 API 엔드포인트 정의
- `shared/schema.ts`: 데이터베이스 스키마 정의
- `client/src/components/`: React 컴포넌트들
- `server/storage.ts`: 데이터베이스 작업 함수들

## ⚠️ 주의사항

1. **환경 변수**: `.env` 파일은 Git에 커밋하지 않도록 주의
2. **업로드 파일**: `uploads/` 및 `attached_assets/` 폴더의 파일은 커밋하지 않음
3. **데이터베이스**: Neon Database 연결 정보 보안 유지
4. **API 키**: OpenAI API 키 노출 방지

## 📚 참고 문서

- `README.md`: 프로젝트 전체 개요
- `STREAMLIT_MIGRATION.md`: Streamlit 전환 가이드
- `replit.md`: 프로젝트 아키텍처 설명

