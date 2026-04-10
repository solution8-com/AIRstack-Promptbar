# Agent Assets

This directory is the canonical home for reusable repository-scoped agent assets.

## Layout

- `skills/claude/prompts.chat/` contains the prompts.chat Claude-facing skills that are exposed from `/.well-known/skills`.
- `skills/windsurf/` contains Windsurf-compatible skills from the same repository source of truth.

## Compatibility Paths

- `plugins/claude/prompts.chat/skills` is preserved as a symlink for Claude plugin consumers.
- `.windsurf/skills` is preserved as a symlink for Windsurf consumers.

When adding or updating reusable skills, edit the files in `.agents/skills/` first.
