# Streamlit 전환 가이드

## 현재 상황

현재 프로젝트는 **Express.js + React** 풀스택 웹 애플리케이션입니다.

### 기술 스택 비교

| 항목 | 현재 (Express + React) | Streamlit |
|------|----------------------|-----------|
| 언어 | TypeScript/JavaScript | Python |
| 프론트엔드 | React + Vite | Streamlit 자체 UI |
| 백엔드 | Express.js | Streamlit (서버 포함) |
| 데이터베이스 | PostgreSQL (Drizzle ORM) | PostgreSQL (SQLAlchemy 등) |
| 인증 | Passport.js + 세션 | Streamlit Session State |
| 파일 업로드 | Multer | Streamlit File Uploader |
| AI 통합 | OpenAI Node.js SDK | OpenAI Python SDK |

## Streamlit 전환 옵션

### 옵션 1: 완전 전환 (권장하지 않음)

전체 프로젝트를 Python + Streamlit으로 재작성해야 합니다.

**장점:**
- Streamlit의 간단한 UI 구성
- Python 생태계 활용

**단점:**
- 전체 코드 재작성 필요 (수백 시간 소요)
- 현재 React UI의 풍부한 기능 손실
- Streamlit의 제한된 커스터마이징
- 복잡한 인증/권한 관리 어려움

### 옵션 2: 하이브리드 접근 (권장)

현재 Express.js 백엔드를 유지하고, Streamlit을 별도 분석 도구로 사용:

```
┌─────────────────┐
│  React Frontend │
│  (현재 유지)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Express Backend │
│  (현재 유지)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
└────────┬────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
┌──────────────┐  ┌──────────────┐
│  React App   │  │  Streamlit   │
│  (메인 앱)    │  │  (분석 도구)  │
└──────────────┘  └──────────────┘
```

**장점:**
- 기존 코드 유지
- Streamlit을 데이터 분석/시각화 도구로 활용
- 각 도구의 장점 활용

**구현 방법:**
1. Express API는 그대로 유지
2. Streamlit 앱을 별도로 생성하여 같은 DB 접근
3. Streamlit은 교사용 분석 대시보드로 활용

### 옵션 3: Streamlit으로 간단한 프로토타입 만들기

핵심 기능만 Streamlit으로 빠르게 구현:

**필요한 작업:**
- Python 환경 설정
- Streamlit 앱 생성
- 데이터베이스 연결 (SQLAlchemy)
- 기본 UI 구현
- OpenAI API 통합

## Streamlit 전환 시 필요한 작업 목록

### 1. 환경 설정
```bash
# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 필요한 패키지 설치
pip install streamlit
pip install psycopg2-binary  # PostgreSQL
pip install sqlalchemy
pip install openai
pip install pandas
pip install streamlit-authenticator  # 인증
```

### 2. 데이터베이스 연결
- SQLAlchemy로 PostgreSQL 연결
- 현재 Drizzle 스키마를 SQLAlchemy 모델로 변환

### 3. 인증 시스템
- Streamlit Session State 사용
- 또는 streamlit-authenticator 라이브러리 활용

### 4. UI 컴포넌트 변환
- React 컴포넌트 → Streamlit 위젯
- 복잡한 UI는 Streamlit의 제한으로 인해 단순화 필요

### 5. 파일 업로드
- `st.file_uploader` 사용
- PDF 파싱은 PyPDF2 또는 pdfplumber 사용

### 6. API 통합
- OpenAI Python SDK 사용
- 기존 Node.js 코드를 Python으로 변환

## 예상 작업 시간

| 작업 | 예상 시간 |
|------|----------|
| 환경 설정 및 DB 연결 | 4-8시간 |
| 인증 시스템 구현 | 8-12시간 |
| 학생 관리 기능 | 8-12시간 |
| 학습 자료 관리 | 12-16시간 |
| 학습 기록 기능 | 12-16시간 |
| 평가 생성 기능 | 8-12시간 |
| UI/UX 개선 | 16-24시간 |
| 테스트 및 디버깅 | 16-24시간 |
| **총 예상 시간** | **84-124시간** |

## 권장 사항

**현재 Express + React 구성을 유지하는 것을 권장합니다.**

이유:
1. 이미 완성도 높은 코드베이스
2. React의 풍부한 UI 컴포넌트
3. TypeScript의 타입 안정성
4. 유지보수 용이성

**Streamlit을 사용해야 하는 경우:**
- 빠른 프로토타입이 필요할 때
- 데이터 분석/시각화에 집중할 때
- Python 생태계를 활용해야 할 때
- 간단한 관리 도구만 필요할 때

## Streamlit 시작 예시 코드

```python
# app.py
import streamlit as st
import pandas as pd
from sqlalchemy import create_engine
import os

# 데이터베이스 연결
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# 페이지 설정
st.set_page_config(page_title="학생평가 시스템", layout="wide")

# 사이드바 로그인
st.sidebar.title("로그인")
username = st.sidebar.text_input("사용자명")
password = st.sidebar.text_input("비밀번호", type="password")

if st.sidebar.button("로그인"):
    # 인증 로직
    st.session_state["authenticated"] = True
    st.session_state["username"] = username

# 메인 콘텐츠
if st.session_state.get("authenticated"):
    st.title("학생평가 시스템")
    
    # 학생 목록 조회
    students = pd.read_sql("SELECT * FROM students", engine)
    st.dataframe(students)
else:
    st.warning("로그인이 필요합니다.")
```

## 결론

현재 프로젝트를 Streamlit으로 완전히 전환하는 것은 큰 작업입니다. 

**대안:**
1. 현재 Express + React 구성을 GitHub에 올리고 배포
2. Streamlit을 별도의 분석/보고 도구로 추가 개발
3. 또는 핵심 기능만 Streamlit으로 빠르게 프로토타입 제작

원하시는 방향을 알려주시면 그에 맞춰 진행하겠습니다.

