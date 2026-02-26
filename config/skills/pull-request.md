## PR Creation Guidelines

### PR Title Format

```
[TICKET-ID] <One-line Summary>
```

Examples:
- `[PP-XXXX] Add user authentication system`
- `[PP-XXXX] Fix payment module bug`

### PR Description Template

```markdown
#### Issue Type
- [ ] Feature addition (feat)
- [ ] Feature removal (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor)
- [ ] Performance improvement (perf)
- [ ] Dependencies, environment variables, configuration file updates (chore)
- [ ] Styling (style)
- [ ] Documentation (docs)
- [ ] Test code (test)

#### Priority
> Mark issue priority based on current JIRA `Priority` criteria
- [ ] Blocker
- [ ] Urgent
- [ ] Critical
- [ ] Major
- [ ] Trivial

#### Background
> Summarize what work is included in this PR and why this work was done

#### Changes
> List major modifications. Add additional comments for parts that might be difficult for reviewers to understand

**API Changes:**
- [ ] No Breaking Changes
- [ ] Breaking Changes (affects backward compatibility)

**Database Changes:**
- [ ] No schema changes
- [ ] Schema changes (migration required)
- [ ] Data migration required

**Major Changed Files:**
- `path/filename.ext` - Summary of changes

#### Testing
> Testing performed before PR submission. List test cases briefly

**Automated Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] New tests added (for new code)
- [ ] Regression tests added (for bug fixes)

**Manual Testing:**
- [ ] Normal operation confirmed in local environment
- [ ] Normal operation confirmed in development environment
- [ ] Browser compatibility confirmed (if applicable)
- [ ] Mobile responsiveness confirmed (if applicable)

**Performance Testing:**
- [ ] No performance impact
- [ ] Performance improvement confirmed
- [ ] Performance degradation (reason: )

#### Screenshots
> Attach Before/After screenshots for UI changes

**Before:**
<!-- Screenshot before changes -->

**After:**
<!-- Screenshot after changes -->

#### Links
> Add links to related documents, work tickets, design guide documents
- [ ] JIRA Ticket: [PP-XXXX](https://ggnetwork.atlassian.net/browse/PP-XXXX)
- [ ] Related Documentation: [Document Name](link)
- [ ] Design Guide: [Figma](link)
- [ ] Related PR: #number

#### Checklist
> Required items to check before creating PR
- [ ] Self-review completed
- [ ] Commit messages follow conventions
- [ ] Code conventions followed
- [ ] Unnecessary console logs/comments removed
- [ ] No secrets or sensitive information included
- [ ] Documentation updated (if necessary)
- [ ] package-lock.json included when dependencies updated
- [ ] CHANGELOG updated for Breaking Changes
```

### Basic Configuration
**Required Checks:**

**Code Quality:**
- File size limit: ≤ 300 LOC
- Function size limit: ≤ 50 LOC
- Parameter limit: ≤ 5
- Cyclomatic complexity: ≤ 10
- Split/refactor required if limits exceeded

**Security Checks:**
- NEVER: Include secrets (passwords/API keys/tokens)
- NEVER: Include sensitive data (PII/card info/SSN)
- NEVER: Create SQL injection, XSS, CSRF vulnerabilities
- ALWAYS: Validate, normalize, and encode all inputs
- ALWAYS: Use parameterized queries
- ALWAYS: Apply authentication/authorization

**Testing Requirements:**
- New code → New tests required
- Bug fixes → Regression tests required
- Write tests to fail first, then fix
- E2E tests: ≥1 success path and ≥1 failure path each

**PR Size Principles:**
- Keep work, commits, and PRs small
- Separate into logical units
- Must be independently buildable/testable

### Pre-PR Creation Checklist

**1. Code Quality Check**
```bash
# Lint check
npm run lint
# or
yarn lint

# Type check
npm run type-check
# or
yarn type-check

# Run tests
npm test
# or
yarn test
```

**2. Required Checks**
- [ ] **Branch Check**: Verify current branch is a feature branch
- [ ] **Update**: Reflect latest changes from target branch (upstream/develop or origin/develop)
- [ ] **Commit Cleanup**: Squash unnecessary commits for cleanup
- [ ] **Resolve Conflicts**: Ensure no merge conflicts
- [ ] **Run Tests**: Verify all tests pass
- [ ] **Update Documentation**: Modify related documents if necessary
- [ ] **Build Check**: Verify build succeeds

**3. Security Check**
- [ ] No secrets, API keys, tokens, or sensitive information included
- [ ] Remove development debug code
- [ ] Clean up console logs

### Review Guidelines

**Reviewer Perspective:**
- [ ] **Functionality**: Does it correctly implement requirements?
- [ ] **Code Quality**: Is it readable and maintainable?
- [ ] **Design**: Are appropriate architecture and patterns used?
- [ ] **Security**: Are there any security vulnerabilities?
- [ ] **Performance**: Is there any negative performance impact?
- [ ] **Testing**: Does it have appropriate test coverage?
- [ ] **Documentation**: Is necessary documentation provided?

**Author Perspective:**
- [ ] **Self Review**: Complete self-review before creating PR
- [ ] **Provide Context**: Clearly explain reasons and intentions for changes
- [ ] **Respond to Reviews**: Respond to feedback within 24 hours
- [ ] **Apply Changes**: Quickly apply requested modifications
- [ ] **CI/CD**: Pass all automated checks

### Frequently Used Commands

**Check PR Status:**
```bash
# List PRs
gh pr list

# View specific PR details
gh pr view <PR-number>

# Checkout PR (for review)
gh pr checkout <PR-number>
```

**Update PR:**
```bash
# Edit PR title/description
gh pr edit <PR-number> --title "New Title" --body "New Description"

# Change Draft PR to Ready
gh pr ready <PR-number>

# Merge PR
gh pr merge <PR-number> --squash
```

### PR Language Guidelines

**Keep technical terms in English, use requested language for descriptions, default to English if no language specified**
- Technical terms: Keep in English (API, database, migration, refactoring, etc.)
- Example: "Add caching logic to improve API response speed"