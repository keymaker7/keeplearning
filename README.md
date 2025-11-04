# 학생평가 시스템 (HaksaengPyeongga)

초등학교 5학년 7반을 위한 학습 관리 및 평가 시스템입니다.

## 프로젝트 개요

이 시스템은 학생들의 주간 학습 기록을 관리하고, AI 기반으로 평가를 생성하는 웹 애플리케이션입니다.

### 주요 기능

- **학생 관리**: 교사가 학생 정보를 등록하고 관리
- **주간 학습 자료 업로드**: PDF 파일을 업로드하여 주간 학습 자료 관리
- **학습 기록**: 학생이 학습 내용과 소감을 기록
- **AI 평가 생성**: OpenAI GPT를 활용한 자동 평가 생성
- **대시보드**: 학생과 교사 각각의 대시보드 제공

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite (빌드 도구)
- Radix UI + shadcn/ui (컴포넌트 라이브러리)
- Tailwind CSS (스타일링)
- TanStack Query (상태 관리)
- Wouter (라우팅)

### Backend
- Express.js + TypeScript
- PostgreSQL (Neon Database)
- Drizzle ORM
- Passport.js (인증)
- Multer (파일 업로드)

### AI/외부 서비스
- OpenAI API (GPT-5)
- Neon Database (PostgreSQL 호스팅)

## 프로젝트 구조

```
HaksaengPyeongga/
├── client/              # React 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   ├── hooks/       # 커스텀 훅
│   │   └── lib/         # 유틸리티
├── server/              # Express 백엔드
│   ├── index.ts         # 서버 진입점
│   ├── routes.ts        # API 라우트
│   ├── auth.ts          # 인증 미들웨어
│   ├── db.ts            # 데이터베이스 연결
│   ├── storage.ts       # 데이터베이스 작업
│   └── openai.ts        # OpenAI 통합
├── shared/              # 공유 스키마
│   └── schema.ts        # Drizzle 스키마
└── uploads/             # 업로드된 파일 저장소
```

## 설치 및 실행

### 필수 요구사항
- Node.js 18 이상
- PostgreSQL 데이터베이스 (Neon 또는 로컬)
- OpenAI API 키

### 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
PORT=5000
SESSION_SECRET=your_session_secret_key
```

### 설치

```bash
npm install
```

### 개발 모드 실행

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

### 데이터베이스 마이그레이션

```bash
npm run db:push
```

## API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### 학생 관리 (교사 전용)
- `GET /api/students` - 학생 목록 조회
- `POST /api/students` - 학생 생성
- `POST /api/students/bulk` - 일괄 학생 생성
- `PUT /api/students/:id` - 학생 정보 수정
- `DELETE /api/students/:id` - 학생 삭제
- `POST /api/students/:id/reset-password` - 비밀번호 초기화

### 주간 학습 자료
- `GET /api/weekly-materials` - 자료 목록
- `POST /api/weekly-materials` - 자료 업로드
- `DELETE /api/weekly-materials/:id` - 자료 삭제
- `GET /api/weekly-materials/timetable/:week` - 주차별 시간표

### 학습 기록
- `GET /api/learning-records` - 학습 기록 조회
- `POST /api/learning-records` - 학습 기록 생성
- `PUT /api/learning-records/:id` - 학습 기록 수정
- `GET /api/learning-records/weekly` - 주차별 기록 조회
- `GET /api/learning-records/daily-summary` - 일별 요약 (교사)

### 평가
- `GET /api/evaluations` - 평가 조회
- `POST /api/evaluations/generate` - AI 평가 생성 (교사)
- `PUT /api/evaluations/:id` - 평가 수정 (교사)
- `DELETE /api/evaluations/:id` - 평가 삭제 (교사)

### 대시보드
- `GET /api/dashboard/stats` - 통계 정보 (교사)

## 데이터베이스 스키마

- **users**: 사용자 계정 (교사/학생)
- **students**: 학생 프로필
- **weekly_materials**: 주간 학습 자료
- **learning_records**: 학습 기록
- **evaluations**: 평가

## 라이선스

MIT

## 참고사항

- 현재 프로젝트는 Express.js + React 기반으로 구성되어 있습니다.
- Streamlit으로 전환하려면 Python으로 재작성해야 합니다.

