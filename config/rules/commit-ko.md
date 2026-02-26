# 커밋 컨벤션

## 커밋 메시지 형식

```
<타입>: [<티켓번호>] <제목>

<본문 내용>
- 구체적인 변경사항
- 주요 로직 설명
```

## 커밋 타입

- feat: 새로운 기능 추가
- fix: 버그 수정
- refactor: 코드 리팩토링 (기능 변경 없음)
- style: 코드 포맷팅, 세미콜론 누락 등 (로직 변경 없음)
- docs: 문서 수정
- test: 테스트 코드 추가/수정
- chore: 빌드 스크립트, 패키지 매니저 등 기타 작업

## 티켓 번호 형식

- `[PP-XXXX]`: 프로젝트 티켓 번호 (예: PP-6050)
- 티켓 번호는 브랜치 이름에서 확인 가능
- 피처 브랜치 이름과 일치해야 함

## 필수 규칙

**중요: 사용자가 명시적으로 요청할 때만 커밋한다. 작업 완료 후 사용자가 구체적으로 요청하지 않으면 절대 자동으로 커밋하지 않는다.**

### 커밋 전 체크리스트

- 작업, 커밋, PR을 작게 유지.
- 전체 파일을 철저히 읽고 영향을 이해.
- 테스트 통과 확인 (새 코드에는 새 테스트 포함).
- 가정사항을 Issues/PRs/ADRs에 기록.

### 절대 보안 검사

- 절대 금지: 코드/로그/환경변수/.env 파일에 비밀값(패스워드/API키/토큰) 커밋.
- 절대 금지: 민감한 데이터(개인정보/신용카드/SSN) 커밋.
- 비밀값 발견 시 즉시 커밋 중단하고 위치 명시.

### 커밋 메시지 규칙

- 제목은 50자 이내로 간결하게
- 본문은 변경사항과 이유를 구체적으로 설명
- 영어로 작성
- **절대 금지: 이모지 사용 금지 (🤖, ✅, 등)**
- **절대 금지: 생성 마커 사용 금지 (Co-Authored-By, Generated with Claude Code, 등)**
- 의도를 드러내는 명확한 설명 작성

### 커밋 프로세스

- 논리적 단위로 커밋 분할 (≤ 300 LOC 파일 제한 준수).
- 커밋 계획 설명 후 승인 받고 진행.
- 각 커밋은 독립적으로 빌드 및 테스트 가능해야 함.

## 금지 패턴

**절대로 커밋 메시지에 추가하지 말 것:**

```
❌ 🤖 Generated with [Claude Code](https://claude.com/claude-code)
❌ Co-Authored-By: Claude <noreply@anthropic.com>
❌ Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
❌ 모든 이모지 (🎉, 🐛, ✨, 등)
❌ 모든 생성 마커 및 AI 표시
```

**올바른 형식:**

```
✅ chore: update installer binary

- Remove debug logs from installer.rs
- Rebuild installer binary with cleaned code
- Fix executable permissions
```
