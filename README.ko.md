**한국어** | [English](README.md)

# ai-nexus

> 200개 이상의 룰과 스킬을 설치하세요. 프롬프트당 2-3개만 로딩.
> 필터링은 Claude 안이 아니라 Claude 바깥에서.

[![npm version](https://img.shields.io/npm/v/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![npm downloads](https://img.shields.io/npm/dw/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**[홈페이지](https://jsk9999.github.io/ai-nexus/)** | **[문서](https://jsk9999.github.io/ai-nexus/docs.html)** | **[로드맵](ROADMAP.ko.md)**

```bash
npx ai-nexus install
```

---

## 문제

`alwaysApply: true` 룰은 매 프롬프트마다 전부 로딩됩니다 — 많을수록 토큰 낭비가 커집니다. `alwaysApply: false`라도 Claude가 모든 룰의 description을 전부 읽고 뭘 로딩할지 판단합니다 — 코드 작성 대신 룰 필터링에 Claude 토큰을 쓰는 셈입니다. 스킬과 커맨드는 호출할 때만 로딩되지만, 뭘 언제 호출해야 하는지 기억해야 합니다.

그래서 대부분 자기검열을 합니다. 관리가 부담되어 룰이나 스킬을 적게 설치하고, 유용한 컨텍스트를 놓치게 됩니다.

[ETH Zurich의 최근 연구](https://arxiv.org/pdf/2602.11988) (12개 레포, 5,694개 PR 대상)가 이를 확인합니다: **모든 룰을 한꺼번에 로드하면 성능이 ~3% 하락하고 비용은 20% 이상 증가합니다.** 결론: 프롬프트마다 관련 컨텍스트만 로드해야 합니다.

게다가 AI 도구마다 형식이 다릅니다 — `.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.codex/AGENTS.md`. 여러 도구를 쓰면 같은 룰과 스킬을 여러 곳에 관리하다 결국 서로 달라집니다.

## 해결

**ai-nexus**는 룰 필터링을 **Claude 바깥에서** 처리합니다. 시맨틱 라우터 훅이 Claude가 시작되기 전에 실행되어 관련 있는 2-3개 파일만 `rules/`에 두고 나머지는 `rules-inactive/`로 물리적으로 빼버립니다. Claude는 나머지가 있는지도 모릅니다. 필터링은 키워드 매칭(무료) 또는 GPT-4o-mini(월 ~$0.50)가 처리.

삭제가 아니라 `rules-inactive/`에 보관. 다음 프롬프트에서 필요하면 즉시 재활성화. 한 번 작성하면 모든 도구에 배포:

```
한 번 작성:
  config/rules/commit.md
  config/skills/react.md

어디서든 배포:
  ✓ Claude Code  → .claude/rules/ (시맨틱 라우팅 포함)
  ✓ Cursor       → .cursor/rules/*.mdc (자동 변환)
  ✓ Codex        → .codex/AGENTS.md (통합)

하나의 소스. 모든 도구가 동기화됩니다.
200개 이상 설치, 프롬프트당 2-3개만 로딩.
```

---

## 왜 ai-nexus?

| | 강점 | 상세 |
|---|---|---|
| **Claude 바깥에서 필터링** | 200개 이상 설치, 프롬프트당 2-3개만 로딩 | 네이티브 `alwaysApply: false`는 Claude가 모든 description을 읽고 판단. ai-nexus는 Claude 시작 전에 필터링 — Claude는 불필요한 파일을 아예 안 봄. 필터링 비용 $0(키워드) 또는 ~$0.50/월(GPT-4o-mini). |
| **한 번 작성, 어디서든 배포** | 하나의 파일 → 세 가지 도구 | `.md` 파일 하나만 작성하면 Cursor용 `.mdc`, Codex용 `AGENTS.md`로 자동 변환. 복붙 불필요. |
| **AI 기반 선택** | GPT-4o-mini 또는 Claude Haiku가 선택 | 매 프롬프트마다 훅이 실행되어 필요한 것만 로딩. 월 ~$0.50. AI 없이도 키워드 매칭으로 무료 동작. |
| **팀 전체 일관성** | Git 기반 공유 | 모든 팀원이 같은 저장소에서 설치. `npx ai-nexus update` 한 번으로 전팀 동기화. |
| **내 수정은 안전** | 비파괴적 업데이트 | install과 update 모두 로컬 커스터마이징을 절대 덮어쓰지 않음. 새 파일만 추가. |
| **커뮤니티 마켓플레이스** | 브라우저에서 검색, 설치, 제거 | `npx ai-nexus browse`로 로컬 웹 UI. 230개 이상의 커뮤니티 룰과 스킬, PR merge 즉시 사용 가능. |

---

## 빠른 시작

```bash
# 대화형 설치 마법사 (기본값)
npx ai-nexus install

# 기본값으로 빠른 설치
npx ai-nexus install -q

# 팀 룰 사용
npx ai-nexus install --rules github.com/your-org/team-rules
```

### 데모

**설치 마법사**

![init](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-setup.gif)

**설치된 룰 목록**

![list](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-rules.gif)

---

## 지원 도구

| 도구 | 동작 방식 | 토큰 부담 |
|------|-----------|-----------|
| **Claude Code** | 시맨틱 라우터가 프롬프트마다 관련 룰과 스킬을 동적 로딩 | 2-3개만 로딩 |
| **Cursor** | `.mdc` 형식으로 변환; Cursor 내장 검색이 필터링 | Cursor 검색에 의존 |
| **Codex** | 집계된 `AGENTS.md` (전체 파일 병합) | 전체 로딩 |

---

## 작동 원리

### Claude Code: 시맨틱 라우터

`alwaysApply: false`는 Claude가 컨텍스트 안에서 모든 description을 읽고 판단합니다. ai-nexus는 Claude가 시작되기 **전에** 훅이 실행되어 관련 파일을 `rules/`로, 나머지를 `rules-inactive/`로 물리적으로 이동시킵니다. Claude는 불필요한 파일을 아예 보지 않습니다:

```
~/.claude/
├── hooks/
│   └── semantic-router.cjs   # 매 프롬프트마다 실행
├── settings.json             # 훅 설정
├── rules/                    # 활성 룰
└── rules-inactive/           # 비활성 룰 (로드 안 됨)
```

**AI 라우팅 사용** (선택):
```bash
export OPENAI_API_KEY=sk-xxx        # 또는 ANTHROPIC_API_KEY
export SEMANTIC_ROUTER_ENABLED=true
```

GPT-4o-mini 또는 Claude Haiku가 프롬프트를 분석해 적절한 룰과 스킬을 선택합니다. 비용: 월 ~$0.50. 명시적으로 활성화해야 동작합니다.

> **상세 설정 가이드:** [시맨틱 라우터 설정](https://jsk9999.github.io/ai-nexus/docs.html#semantic-router-setup) — 프로바이더 선택, 환경 변수, 커스텀 모델, 동작 확인 방법.

**AI 없이** (기본값):
프롬프트의 키워드를 매칭해서 룰과 스킬을 활성화합니다. 비용 없음, API 키 불필요.

### Cursor: 룰 변환기

ai-nexus가 `.md` 룰을 Cursor의 `.mdc` 형식으로 변환하면서 `description`과 `alwaysApply` 메타데이터를 자동 추가합니다:

```markdown
---
description: Git 커밋 메시지 컨벤션 및 모범 사례
alwaysApply: false
---

# 커밋 룰
...
```

변환 후 룰 필터링은 **Cursor 내장 시맨틱 서치**가 처리합니다 — ai-nexus가 Cursor에서 라우터를 실행하지는 않습니다. 핵심 가치는 통합 룰 관리: 룰을 한 번 작성하면 Claude Code, Cursor, Codex에서 모두 사용할 수 있습니다.

### Codex: 룰 집계

개별 룰 파일들이 단일 `AGENTS.md` 파일로 자동 병합되며, 세션 시작 시 로드됩니다. 동적 로딩 없음.

> **Codex 사용자: 필요한 룰만 선택하세요.** 모든 룰이 매 세션마다 로딩되므로, 너무 많이 설치하면 토큰이 낭비됩니다. 대화형 설치 마법사(`npx ai-nexus install`)에서 필요한 카테고리와 파일만 선택하세요. 권장 시작 세트: `rules/essential.md`, `rules/commit.md`, `rules/security.md`.

---

## 명령어

| 명령어 | 설명 |
|--------|------|
| `install` | 전역 설치 (대화형 마법사) |
| `install -q` | 기본값으로 빠른 설치 |
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

## 업데이트 & 로컬 우선

룰은 독립적인 복사본으로 설치됩니다. 사용자의 커스터마이징은 항상 안전합니다:

- **기존 파일은 절대 덮어쓰지 않음** (install, update 모두)
- 소스에서 새 파일만 추가
- `npx ai-nexus update`로 최신 패키지의 새 룰을 동기화
- `--force`로 강제 덮어쓰기 (백업 먼저!)

```bash
# 커스텀 commit.md를 덮어쓰지 않음
npx ai-nexus update

# 모든 파일 강제 덮어쓰기
npx ai-nexus update --force
```

> **symlink 모드에서 마이그레이션?** `npx ai-nexus update`만 실행하면 symlink이 자동으로 복사본으로 변환됩니다.

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
├── rules/                    # .ai-nexus/config/rules에서 복사
└── commands/                 # .ai-nexus/config/commands에서 복사

.cursor/rules/                # Cursor (.mdc 파일)
├── essential.mdc
└── commit.mdc

.codex/AGENTS.md              # Codex
```

---

## 사용 예시

### 개인 설정

```bash
npx ai-nexus install
# 선택: Claude Code, Cursor
# 선택: rules, commands, hooks, settings
# 템플릿: React/Next.js
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

## 네트워크 & 개인정보

ai-nexus는 로컬에서 실행됩니다. 아래는 이 도구가 수행할 수 있는 모든 네트워크 요청 목록입니다:

| 시점 | 대상 | 목적 | 필수 여부 |
|------|------|------|-----------|
| 시맨틱 라우팅 (프롬프트마다) | `api.openai.com` | GPT-4o-mini를 통한 AI 룰 선택 | **옵트인 전용** — `SEMANTIC_ROUTER_ENABLED=true` + `OPENAI_API_KEY` 필요 |
| 시맨틱 라우팅 (프롬프트마다) | `api.anthropic.com` | Claude Haiku를 통한 AI 룰 선택 | **옵트인 전용** — `SEMANTIC_ROUTER_ENABLED=true` + `ANTHROPIC_API_KEY` 필요 |
| `search`, `get`, `browse` | `api.github.com` | 커뮤니티 룰 레지스트리 조회 | 해당 명령어 실행 시에만 |
| `get` | `raw.githubusercontent.com` | 룰 파일 콘텐츠 다운로드 | `get` 실행 시에만 |
| `browse` | `localhost:3847` | 마켓플레이스 UI용 로컬 전용 HTTP 서버 | `127.0.0.1`에 바인딩 — 외부 접근 불가 |
| `install --rules <url>` | Git 원격 호스트 | 팀 룰 저장소 클론 | `--rules` URL 제공 시에만 |

**텔레메트리 없음. 분석 수집 없음. 외부 데이터 전송 없음.**

- API 키는 환경 변수에서만 읽으며, 디스크에 저장하거나 로깅하지 않습니다.
- 프롬프트가 OpenAI/Anthropic으로 전송되는 것은 시맨틱 라우팅을 **명시적으로 활성화**한 경우에만 해당됩니다. 비활성화 시 키워드 기반 폴백이 완전히 오프라인으로 동작합니다.
- `browse` 서버는 `127.0.0.1`에 바인딩되어 네트워크에서 접근할 수 없습니다.

---

## 룰 마켓플레이스

![browse](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-marketplace.png)

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

Method: Keyword matching

Selected files (3):
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
cd ai-nexus && npm install && npm run build

# config/rules/에 룰 추가 후 테스트:
node bin/ai-nexus.cjs test "your prompt"
```

---

## FAQ

**나한테 이게 필요해?**

도구 하나에 룰이나 스킬 몇 개면 굳이 필요 없습니다. 해당 도구 자체 설정으로 충분해요. ai-nexus는 이런 사람들을 위한 거예요:
- 룰/스킬을 많이 설치하고 효율적으로 로딩하고 싶을 때 (200개 이상 설치, 2-3개만 로딩)
- **여러 도구** (Claude Code + Cursor + Codex)를 쓰면서 한 곳에서 관리하고 싶을 때
- **230개 이상 커뮤니티 룰과 스킬**을 직접 안 쓰고 바로 가져다 쓰고 싶을 때

**스킬만 쓰고 룰은 안 쓰는데, 의미가 있나요?**

네. 시맨틱 라우터는 스킬, 룰, 커맨드, 에이전트 전부 동일하게 라우팅합니다. 스킬 50개를 깔아도 프롬프트마다 관련 있는 것만 로딩됩니다. "다 설치해도 토큰 걱정 없음"이 스킬에도 똑같이 적용됩니다.

**Claude Code 스킬(`alwaysApply: false`)이랑 뭐가 다른가요?**

스킬은 Claude Code 안에서 온디맨드 로딩을 처리합니다. ai-nexus는 추가로:
- **크로스 도구 동기화** — 스킬을 Cursor와 Codex에도 배포
- **더 저렴한 라우팅** — 키워드 매칭(무료) 또는 저렴한 모델로 필터링
- **커뮤니티 라이브러리** — 230개 이상의 룰과 스킬 바로 사용

**CLAUDE.md나 AGENTS.md에 다 넣으면 되지 않나요?**

5개면 괜찮지만 50개 넘으면 커밋 메시지 쓸 때 Docker best practices까지 같이 로드됩니다. [ETH Zurich 연구](https://arxiv.org/pdf/2602.11988)에서도 성능과 비용 둘 다 악화시킨다고 나왔습니다. ai-nexus는 프롬프트당 2-3개만 로드합니다.

**스킬 vs 룰?**

스킬은 직접 호출하는 워크플로우 (`/commit`, `/review`). 룰은 자동으로 적용되는 패시브 가이드라인 (코딩 컨벤션, 보안 기준, 네이밍 패턴). ai-nexus는 둘 다 프롬프트 기반으로 라우팅 — 뭘 호출할지 기억할 필요 없음.

---

## 지원하기

ai-nexus가 유용하셨다면 GitHub에서 ⭐을 눌러주세요 — 더 많은 사람들이 프로젝트를 발견하고, 개발을 이어가는 데 큰 힘이 됩니다.

[![Star on GitHub](https://img.shields.io/github/stars/JSK9999/ai-nexus?style=social)](https://github.com/JSK9999/ai-nexus)

---

## 라이선스

Apache 2.0
