---
description: Search and discover Agent Skills from promptbar
argument-hint: <query> [--category CATEGORY] [--tag TAG]
---

# /promptbar:skills

Search for Agent Skills on promptbar to extend Claude's capabilities.

## Usage

```
/promptbar:skills <query>
/promptbar:skills <query> --category coding
/promptbar:skills <query> --tag automation
```

- **query**: Keywords to search for (required)
- **--category**: Filter by category slug
- **--tag**: Filter by tag slug

## Examples

```
/promptbar:skills code review
/promptbar:skills documentation --category coding
/promptbar:skills testing --tag automation
/promptbar:skills api integration
/promptbar:skills data analysis
```

## How It Works

1. Calls `search_skills` with your query and optional filters
2. Returns matching skills with title, description, author, files, and tags
3. Each result includes a link to view the skill on promptbar

## Getting a Specific Skill

After finding a skill you want, use its ID to get all files:

```
/promptbar:skills get <skill-id>
```

This retrieves the skill with all its files (SKILL.md, reference docs, scripts, etc.)

## Installing a Skill

To download and install a skill to your workspace:

```
/promptbar:skills install <skill-id>
```

This saves the skill files to `.claude/promptbar:skills/{slug}/` structure.

## Creating a Skill

To create a new skill on promptbar (requires API key):

```
/promptbar:skills create "My Skill Title" --description "What this skill does"
```

You'll be prompted to provide the SKILL.md content and any additional files.

## Skill Structure

Skills can contain multiple files:
- **SKILL.md** (required) - Main instructions with frontmatter
- **Reference docs** - Additional documentation
- **Scripts** - Helper scripts (Python, shell, etc.)
- **Config files** - JSON, YAML configurations
