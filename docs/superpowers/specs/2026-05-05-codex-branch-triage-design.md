# Branch Triage Design: `codex/add-cherry-picked-commits` vs `main`

**Date:** 2026-05-05
**Goal:** Determine whether to abandon `codex/add-cherry-picked-commits` or selectively merge its changes into `main`, by comparing at the feature, component, and capability level.

---

## Context

`codex/add-cherry-picked-commits` diverged from `main` at commit `40926108` (Merge PR #54: fix-409-error-creating-prompts). Since the split:

- `main` has grown by 35 commits (guide edit, MCP comments, OIDC/OAuth plugins, prompt additions, project rename).
- `codex/add-cherry-picked-commits` has grown by 19 commits containing a feed filter UX redesign, a URL utility refactor, auth test coverage, i18n additions, and documentation fixes.

None of the 19 codex commits exist in `main`. The branches have diverged independently and share no commits after the split point. Key files modified in both branches (`src/app/feed/page.tsx`, `src/components/prompts/prompt-form.tsx`, `src/app/prompts/[id]/page.tsx`) will require conflict resolution if merged.

---

## Process Flow

```
Phase 0 — Pre-flight conflict map
  └─ git merge --no-commit --no-ff on a throwaway branch
  └─ Output: exact list of conflicting files

Phase 1 — Commit inventory
  └─ Group 19 commits into 5 capability clusters
  └─ Map intra-cluster dependencies
  └─ Output: dependency graph

Phase 2 — Per-change triage  (core work)
  └─ git diff main origin/codex -- <file> for each commit's files
  └─ Classify each commit with the 4-state model
  └─ Output: filled triage table

Phase 3 — Branch verdict
  └─ Score each cluster by state distribution
  └─ Apply decision rubric
  └─ Output: final decision doc (abandon / full merge / selective cherry-pick)
```

---

## The 4-State Classifier

| State | Symbol | Meaning | Default Action |
|-------|--------|---------|----------------|
| **Absent** | 🟢 | Not in main at all. Clean port. | Cherry-pick candidate |
| **Superseded** | 🔴 | Main has equivalent or better. | Drop |
| **Conflicted** | 🟡 | Both branches changed the same area differently. | Assess resolution cost |
| **Dependent** | 🔗 | Only valid if another codex commit also lands. | Inherit cluster decision |

**Important:** Absent ≠ automatically worth merging. A change can be Absent but architecturally incompatible with main's current design — this must be noted in the triage table.

---

## The 5 Capability Clusters

Commits inside a cluster must be evaluated as a unit. Dropping the anchor commit orphans all dependent commits in that cluster.

### Cluster A — Feed Filter UX (12 commits)

| Hash | Subject | Role |
|------|---------|------|
| `6406006e` | UX iteration: filter tabs, prompt-form, comment-item | **Anchor** |
| `a7c47c73` | i18n filter labels, non-interactive buttons, authorUrl fallback | Depends on anchor |
| `55d59d02` | feed/page.tsx Copilot fix | Depends on anchor |
| `64017bfb` | feed/page.tsx Copilot fix | Depends on anchor |
| `aeb2a401` | Docstrings for UXiteration1 components | Depends on anchor |
| `d8716405` | Merge PR #57 — coderabbitai docstrings | Depends on anchor |
| `0cd39ed1` | messages/de.json feed filter keys | Depends on anchor |
| `b33f2650` | messages/fa.json feed filter keys | Depends on anchor |
| `be6d5e42` | messages/zh.json feed filter keys | Depends on anchor |
| `070d332b` | messages/ru.json feed filter keys | Depends on anchor |
| `e12fd770` | messages/ar.json feed filter keys | Depends on anchor |
| `d9bd00af` | messages/ja.json feed filter keys + CLAUDE-PLUGIN.md + .gitignore | Depends on anchor |

**Key risk:** `feed/page.tsx` was also modified in `main`. The codex version replaces the Browse All / Discover buttons with a filter chip row (Heart / Bookmark / UserPlus icons). Main's version is simpler. These will conflict.

---

### Cluster B — URL Utility (1 commit, standalone)

| Hash | Subject |
|------|---------|
| `a0c6aad6` | Refactor: centralize base URL logic in `getBaseUrl()` utility |

`src/lib/urls.ts` currently has `getPromptUrl()`, `getPromptEditUrl()`, `getPromptChangesUrl()` but no `getBaseUrl()`. This commit adds it and refactors `src/app/prompts/[id]/page.tsx`, `src/app/sitemap.ts`, `src/components/seo/structured-data.tsx` to use it.

**Key risk:** `src/app/prompts/[id]/page.tsx` was modified in `main` independently. May conflict.

---

### Cluster C — Auth Test Coverage (1 commit, standalone)

| Hash | Subject |
|------|---------|
| `71d09f24` | Vitest: change-request PATCH authorization (non-owner → 403, admin → 200) |

`src/__tests__/api/change-requests.test.ts` does not exist in main. This is a 209-line test file — clean port unless the change-request route itself was modified in main.

---

### Cluster D — CLAUDE-PLUGIN.md Fixes (3 commits)

| Hash | Subject |
|------|---------|
| `bf43bc44` | MD040: language specifiers on code blocks |
| `345f334c` | Copilot autofix on CLAUDE-PLUGIN.md |
| `c557b261` | Copilot autofix on CLAUDE-PLUGIN.md _(may be empty commit — verify with `git show c557b261 --stat`)_ |

Main's `CLAUDE-PLUGIN.md` (166 lines) has code blocks without language specifiers. These fixes address that. Low conflict risk since main hasn't touched CLAUDE-PLUGIN.md recently.

---

### Cluster E — Housekeeping (2 commits, standalone)

| Hash | Subject |
|------|---------|
| `be6d654a` | .gitignore update (coderabbitai co-authored) |
| `3239882e` | .gitignore fix |

Simple `.gitignore` changes. Merge or drop based on whether main's `.gitignore` already covers what these add.

---

## Triage Table (to be filled during Phase 2)

| Hash | Subject | Files | Cluster | State | Conflict complexity | Decision | Notes |
|------|---------|-------|---------|-------|---------------------|----------|-------|
| `6406006e` | UX iteration | feed/page.tsx, prompt-form.tsx, comment-item.tsx, CLAUDE-PLUGIN.md | A | — | — | — | |
| `a7c47c73` | i18n + authorUrl fallback | messages/*.json, feed/page.tsx, prompts/[id]/page.tsx | A | 🔗 | — | — | Inherits cluster A |
| `55d59d02` | feed fix | feed/page.tsx | A | 🔗 | — | — | Inherits cluster A |
| `64017bfb` | feed fix | feed/page.tsx | A | 🔗 | — | — | Inherits cluster A |
| `aeb2a401` | Docstrings | feed/page.tsx, prompt-form.tsx, comment-item.tsx | A | 🔗 | — | — | Inherits cluster A |
| `d8716405` | Merge PR #57 docstrings | feed/page.tsx, prompt-form.tsx, comment-item.tsx | A | 🔗 | — | — | Inherits cluster A |
| `0cd39ed1` | de.json | messages/de.json | A | 🔗 | — | — | Inherits cluster A |
| `b33f2650` | fa.json | messages/fa.json | A | 🔗 | — | — | Inherits cluster A |
| `be6d5e42` | zh.json | messages/zh.json | A | 🔗 | — | — | Inherits cluster A |
| `070d332b` | ru.json | messages/ru.json | A | 🔗 | — | — | Inherits cluster A |
| `e12fd770` | ar.json | messages/ar.json | A | 🔗 | — | — | Inherits cluster A |
| `d9bd00af` | ja.json + CLAUDE-PLUGIN.md + .gitignore | messages/ja.json, CLAUDE-PLUGIN.md, .gitignore | A+D+E | 🔗 | — | — | Multi-cluster commit |
| `a0c6aad6` | getBaseUrl() | src/lib/urls.ts, sitemap.ts, structured-data.tsx, prompts/[id]/page.tsx | B | — | — | — | |
| `71d09f24` | Change-request tests | src/__tests__/api/change-requests.test.ts | C | — | — | — | |
| `bf43bc44` | CLAUDE-PLUGIN.md MD040 | CLAUDE-PLUGIN.md | D | — | — | — | |
| `345f334c` | CLAUDE-PLUGIN.md fix | CLAUDE-PLUGIN.md | D | — | — | — | |
| `c557b261` | CLAUDE-PLUGIN.md fix | CLAUDE-PLUGIN.md | D | — | — | — | |
| `be6d654a` | .gitignore | .gitignore | E | — | — | — | |
| `3239882e` | .gitignore | .gitignore | E | — | — | — | |

---

## Branch Verdict Rubric

After the triage table is complete, score each cluster and apply:

| Cluster score | Verdict |
|---------------|---------|
| Mostly 🟢 Absent, no conflict | **Merge** — cherry-pick the cluster |
| Mostly 🔴 Superseded | **Drop** — main already has it |
| 🟡 Conflicted, low complexity | **Resolve and merge** — worth the work |
| 🟡 Conflicted, high complexity | **Drop or redesign** — rebase cost exceeds value |
| Mixed within cluster | **Selective** — cherry-pick Absent commits, drop Superseded |

**Final branch decision** is the aggregate of all cluster verdicts:
- All clusters → Merge or Resolve: **Full merge** (rebase onto main)
- All clusters → Drop: **Abandon branch**
- Mixed: **Selective cherry-pick** — extract the keeper commits to a new branch, abandon the rest

---

## Pre-flight Commands (Phase 0)

```bash
# Create a throwaway branch from main
git checkout -b triage/codex-merge-test main

# Simulate the merge (no commit, no fast-forward)
git merge --no-commit --no-ff origin/codex/add-cherry-picked-commits

# See which files conflict
git status | grep "both modified"

# Clean up
git merge --abort
git checkout main
git branch -D triage/codex-merge-test
```

---

## Per-Change Diff Command (Phase 2)

For each commit, run:

```bash
# See exactly what codex has vs main for a specific file
git diff main origin/codex/add-cherry-picked-commits -- <file-path>

# See what a specific commit changed (for context)
git show <hash> --stat
git show <hash> -- <file-path>
```

---

## Success Criteria

The process is complete when:
1. Every row in the triage table has a non-`—` State, Conflict complexity, and Decision.
2. Every cluster has a verdict.
3. A final one-sentence branch decision is written: abandon / full merge / selective cherry-pick + which clusters.
