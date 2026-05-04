---
description: Search and discover AI prompts from promptbar
argument-hint: <query> [--type TYPE] [--category CATEGORY] [--tag TAG]
---

# /promptbar:prompts

Search for AI prompts on promptbar to find the perfect prompt for your task.

## Usage

```
/promptbar:prompts <query>
/promptbar:prompts <query> --type IMAGE
/promptbar:prompts <query> --category coding
/promptbar:prompts <query> --tag productivity
```

- **query**: Keywords to search for (required)
- **--type**: Filter by type (TEXT, STRUCTURED, IMAGE, VIDEO, AUDIO)
- **--category**: Filter by category slug
- **--tag**: Filter by tag slug

## Examples

```
/promptbar:prompts code review
/promptbar:prompts writing assistant --category writing
/promptbar:prompts midjourney --type IMAGE
/promptbar:prompts react developer --tag coding
/promptbar:prompts data analysis --category productivity
```

## How It Works

1. Calls `search_prompts` with your query and optional filters
2. Returns matching prompts with title, description, author, and tags
3. Each result includes a link to view/copy the full prompt on promptbar

## Getting a Specific Prompt

After finding a prompt you like, use its ID to get the full content:

```
/promptbar:prompts get <prompt-id>
```

This will retrieve the prompt and prompt you to fill in any variables.

## Saving Prompts

To save a prompt to your promptbar account (requires API key):

```
/promptbar:prompts save "My Prompt Title" --content "Your prompt content here..."
```

## Improving Prompts

To enhance a prompt using AI:

```
/promptbar:prompts improve "Write a story about..."
```

This transforms basic prompts into well-structured, comprehensive ones.
