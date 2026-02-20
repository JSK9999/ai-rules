**한국어** | [English](README.md)

# ai-nexus

> 토큰 낭비를 멈추세요. 필요한 룰만 로드하세요.

**Claude Code**, **Cursor**, **Codex**를 위한 AI 코딩 어시스턴트 룰 매니저.

[![npm version](https://img.shields.io/npm/v/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

```bash
npx ai-nexus install
```

---

## 문제

Claude Code에 질문할 때마다 **모든** 룰이 로드됩니다:

```
Loading rules... 4,300 lines
토큰 비용: 요청당 ~5,000 토큰
```

Git 커밋에 대해 물어보는데 React 룰까지 로드되는 건 낭비입니다.

## 해결

**ai-nexus**는 시맨틱 라우터를 사용해 관련 룰만 로드합니다:

```
You: "커밋 메시지 작성해줘"

Semantic Router 활성화:
  ✓ commit.md (필요)
  ✓ essential.md (항상 활성)
  ✗ react.md (건너뜀)
  ✗ security.md (건너뜀)

토큰 비용: ~800 토큰 (84% 절약)
```

---

## 빠른 시작

```bash
# 대화형 설치 (권장)
npx ai-nexus install -i

# 기본값으로 빠른 설치
npx ai-nexus install

# 팀 룰 사용
npx ai-nexus install --rules github.com/your-org/team-rules
```

---

## 지원 도구

| 도구 | 동작 방식 | 토큰 절약 |
|------|-----------|-----------|
| **Claude Code** | 시맨틱 라우터가 프롬프트마다 동적으로 룰 교체 | ~84% |
| **Cursor** | `.mdc` description 필드를 통한 시맨틱 서치 | ~70% |
| **Codex** | 정적 `AGENTS.md` (동적 로딩 없음) | - |

---

## 작동 원리

### Claude Code: 시맨틱 라우터

매 프롬프트마다 훅이 실행되어 실제로 필요한 룰을 분석합니다:

```
~/.claude/
├── hooks/
│   └── semantic-router.cjs   # 매 프롬프트마다 실행
├── settings.json             # 훅 설정
├── rules/                    # 활성 룰
└── rules-inactive/           # 비활성 룰 (로드 안 됨)
```

**AI 라우팅 사용** (권장):
```bash
export OPENAI_API_KEY=sk-xxx        # 또는 ANTHROPIC_API_KEY
export SEMANTIC_ROUTER_ENABLED=true
```

GPT-4o-mini 또는 Claude Haiku가 프롬프트를 분석해 적절한 룰을 선택합니다. 비용: 월 ~$0.50.

**AI 없이** (폴백):
프롬프트의 키워드를 매칭해서 룰을 활성화합니다.

### Cursor: 시맨틱 서치

룰이 description 메타데이터가 포함된 `.mdc` 형식으로 변환됩니다:

```markdown
---
description: Git 커밋 메시지 컨벤션 및 모범 사례
alwaysApply: false
---

# 커밋 룰
...
```

Cursor의 내장 시맨틱 서치가 관련도에 따라 룰을 로드합니다.

### Codex: 정적 룰

세션 시작 시 단일 `AGENTS.md` 파일이 로드됩니다. 동적 로딩 없음.

---

## 명령어

| 명령어 | 설명 |
|--------|------|
| `install` | 전역 설치 (`~/.claude/`) |
| `install -i` | 대화형 모드 - 도구, 룰, 템플릿 선택 |
| `init` | 현재 프로젝트에 설치 (`.claude/`) |
| `update` | 최신 룰로 동기화 (로컬 변경 보호) |
| `list` | 설치된 룰 목록 |
| `test <prompt>` | 어떤 룰이 로드될지 미리보기 |
| `search [keyword]` | 커뮤니티 레지스트리에서 룰 검색 |
| `get <filename>` | 커뮤니티 레지스트리에서 룰 다운로드 |
| `add <url>` | Git 저장소에서 룰 추가 |
| `remove <name>` | 룰 소스 제거 |
| `browse` | 브라우저에서 룰 마켓플레이스 열기 |
| `doctor` | 설치 상태 진단 |
| `uninstall` | ai-nexus 제거 |

---

## 팀 룰

Git을 통해 팀 전체에 룰을 공유하세요:

```bash
# 모든 팀원이 같은 소스에서 설치
npx ai-nexus install --rules github.com/acme/team-rules

# 룰 업데이트 시
npx ai-nexus update
```

### 룰 저장소 구조

```
team-rules/
├── config/
│   ├── rules/           # 핵심 룰 (essential.md, security.md)
│   ├── commands/        # 슬래시 커맨드 (/commit, /review)
│   ├── skills/          # 도메인 지식 (react.md, rust.md)
│   ├── agents/          # 서브 에이전트 (code-reviewer.md)
│   ├── contexts/        # 컨텍스트 파일 (@dev, @research)
│   ├── hooks/           # semantic-router.cjs
│   └── settings.json    # Claude Code 훅 설정
└── README.md
```

### 룰 형식

```markdown
---
description: 이 룰을 로드할 시점 (시맨틱 라우터가 사용)
---

# 룰 제목

룰 내용...
```

---

## 설치 모드

### Symlink (기본값)

```bash
npx ai-nexus install
```

- 룰이 소스에 링크 → `update`로 즉시 동기화
- 룰을 직접 수정 불가 (소스에서 수정)

### Copy

```bash
npx ai-nexus install --copy
```

- 룰이 독립적인 복사본
- 로컬에서 자유롭게 수정 가능
- `update`는 새 파일만 추가, 기존 파일 덮어쓰지 않음

---

## 로컬 우선

사용자의 커스터마이징은 항상 안전합니다:

- **기존 파일은 절대 덮어쓰지 않음** (install, update 모두)
- 소스에서 새 파일만 추가
- `--force`로 강제 덮어쓰기 (백업 먼저!)

```bash
# 커스텀 commit.md를 덮어쓰지 않음
npx ai-nexus update

# 모든 파일 강제 덮어쓰기
npx ai-nexus update --force
```

---

## 디렉토리 구조

```
.ai-nexus/                    # ai-nexus 메타데이터
├── config/                   # 모든 소스에서 병합된 룰
├── sources/                  # 클론된 Git 저장소
└── meta.json                 # 설치 정보

.claude/                      # Claude Code
├── hooks/semantic-router.cjs
├── settings.json
├── rules/          → .ai-nexus/config/rules
└── commands/       → .ai-nexus/config/commands

.cursor/rules/                # Cursor (.mdc 파일)
├── essential.mdc
└── commit.mdc

.codex/AGENTS.md              # Codex
```

---

## 사용 예시

### 개인 설정

```bash
npx ai-nexus install -i
# 선택: Claude Code, Cursor
# 선택: rules, commands, hooks, settings
# 템플릿: React/Next.js
# 모드: symlink
```

### 팀 설정

```bash
# 1. GitHub에 팀 룰 저장소 생성

# 2. 각 개발자:
npx ai-nexus install --rules github.com/acme/team-rules

# 3. 주간 동기화:
npx ai-nexus update
```

### 멀티 소스 설정

```bash
# 기본 회사 룰
npx ai-nexus install --rules github.com/acme/base-rules

# 프론트엔드 팀 룰 추가
npx ai-nexus add github.com/acme/frontend-rules

# 보안 룰 추가
npx ai-nexus add github.com/acme/security-rules

# 전체 업데이트
npx ai-nexus update
```

---

## 룰 마켓플레이스

![browse](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/browse.png)

웹 기반 마켓플레이스에서 룰을 검색, 설치, 제거할 수 있습니다:

```bash
npx ai-nexus browse
```

- 커뮤니티 룰 실시간 검색 및 카테고리 필터
- 브라우저에서 직접 설치/제거
- 도구 상태 (Claude Code, Cursor, Codex) 및 진단 확인
- `http://localhost:3847`에서 로컬 실행

---

## 커뮤니티 레지스트리

커뮤니티가 기여한 룰을 GitHub에서 직접 검색하고 다운로드하세요 — `npm publish` 불필요.

```bash
# 전체 룰 목록 보기
npx ai-nexus search

# 키워드로 검색
npx ai-nexus search react
```

```
  Results for "react":

  skills/
    react.md - React/Next.js best practices

  1 file(s) found.
  Use "ai-nexus get <filename>" to download.
```

```bash
# 룰 다운로드
npx ai-nexus get react.md

# 동일 이름이 여러 카테고리에 있을 때 카테고리 지정
npx ai-nexus get commit.md --category commands
```

룰은 [최신 GitHub 저장소](https://github.com/JSK9999/ai-nexus/tree/main/config)에서 `~/.claude/`로 다운로드됩니다. PR로 새 룰을 기여하면 merge 즉시 `search`와 `get`으로 사용 가능합니다.

---

## 테스트

주어진 프롬프트에 어떤 룰이 로드될지 미리 확인:

```bash
$ npx ai-nexus test "react 컴포넌트에 hooks 사용해서 작성해줘"

Selected rules (3):
  • rules/essential.md
  • rules/react.md
  • skills/react.md
```

---

## 기여하기

룰 기여를 환영합니다! 기여된 룰은 `ai-nexus search`와 `ai-nexus get`으로 즉시 사용 가능합니다 — npm publish 불필요.

1. **룰 제안**: [Rule Request 열기](https://github.com/JSK9999/ai-nexus/issues/new?template=rule-request.yml)
2. **룰 제출**: [CONTRIBUTING.md](CONTRIBUTING.md) 전체 가이드 참고

```bash
# 기여자 빠른 시작
git clone https://github.com/JSK9999/ai-nexus.git
cd ai-rules && npm install && npm run build

# config/rules/에 룰 추가 후 테스트:
node bin/ai-rules.cjs test "your prompt"
```

---

## 라이선스

Apache 2.0
