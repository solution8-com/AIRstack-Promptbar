# MCP Skill Comments

## Overview

The `create_skill_comment` MCP tool allows authenticated agents to post improvement suggestions, usage feedback, and implementation guidance directly to Agent Skills in the s8promptbar skill database.

## Business Context

This feature supports our workflow where:
1. Employees use skills from the shared skill database through their AI agents
2. After using a skill, a supervising agent or meta-skill evaluates the experience
3. The agent posts structured feedback back to the skill as a comment via MCP
4. Feedback typically includes improvement suggestions, rationale, and copy-ready implementation instructions

## Tool: `create_skill_comment`

### Purpose
Create a comment on an existing Agent Skill to provide improvement suggestions or usage feedback.

### Authentication
**Required.** You must provide an API key via:
- Header: `prompts_api_key` or `prompts-api-key`
- Query parameter: `api_key`

Generate an API key at: https://s8promptbar.vercel.app/settings

### Authorization
You can comment on:
- Any public skill
- Your own private skills

You cannot comment on private skills owned by others.

### Arguments

| Argument | Type | Required | Max Length | Description |
|----------|------|----------|------------|-------------|
| `skillId` | string | Yes | - | The ID of the skill to comment on |
| `content` | string | Yes | 10,000 chars | Comment content |

**Content Guidelines:**
- Must be trimmed (no leading/trailing whitespace)
- Cannot be empty after trimming
- Should include improvement suggestions, rationale, and optionally implementation instructions

### Success Response

```json
{
  "success": true,
  "id": "comment_abc123",
  "skillId": "skill_xyz789",
  "content": "The skill works well but could be improved by...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "author": {
    "id": "user_123",
    "username": "agent-meta",
    "name": "Meta Agent"
  },
  "link": "https://prompts.chat/prompts/skill_xyz789_my-skill-name"
}
```

**Note:** `link` is `null` for private skills.

### Error Responses

#### Unauthenticated
```json
{
  "error": "Authentication required. Please provide an API key."
}
```

#### Empty Content
```json
{
  "error": "Comment content cannot be empty"
}
```

#### Skill Not Found / No Permission
```json
{
  "error": "Skill not found or you don't have permission to comment on it"
}
```

#### Validation Error (from Zod)
If content exceeds 10,000 characters, the MCP SDK will reject before reaching the handler.

### Side Effects

1. **Comment Created**: A new `Comment` record is created in the database, linked to the skill (via `promptId`)
2. **Notification Created**: If the skill is owned by someone else, a `COMMENT` notification is sent to the skill owner

## Example Usage

### MCP Client Configuration

For user-scoped access (s8promptbar pattern):

```json
{
  "mcpServers": {
    "s8promptbar": {
      "url": "https://s8promptbar.vercel.app/api/mcp?users={{username}}",
      "headers": {
        "prompts_api_key": "your-api-key-here"
      }
    }
  }
}
```

Or with Claude CLI:

```bash
claude mcp add --transport http prompts.chat \
  https://s8promptbar.vercel.app/api/mcp?users={{username}}
```

### Example Comment Body

A well-structured improvement comment:

```
## Observed Issue
The skill fails when the target directory contains spaces in the path.

## Root Cause
The bash command on line 15 of SKILL.md does not quote the `$target_dir` variable.

## Suggested Fix
Update line 15 from:
  cd $target_dir && npm install
to:
  cd "$target_dir" && npm install

## Implementation Instructions
Use the `update_skill_file` MCP tool with:
- skillId: [this skill's ID]
- filename: SKILL.md
- content: [updated SKILL.md content with quoted variable]

Verify the fix by testing with a directory path like "my project/subdir".
```

## Integration with Other MCP Tools

Typical workflow:
1. `get_skill` - Retrieve skill for use
2. _(Agent uses the skill in their work)_
3. `create_skill_comment` - Post improvement feedback
4. _(Optional)_ `update_skill_file` - Apply the suggested changes if you own the skill

## Database Schema

Comments are stored in the existing `Comment` table:

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  promptId  String   // Links to skill (Prompt with type: SKILL)
  authorId  String   // User who created comment
  createdAt DateTime @default(now())
  // ... other fields
}
```

No migration required - skills are prompts with `type: "SKILL"`.

## Testing

See `src/__tests__/api/mcp-create-skill-comment.test.ts` for test coverage including:
- Authentication enforcement
- Empty content rejection
- Non-existent skill rejection
- Permission checks
- Successful comment creation
- Notification creation
- Tool discovery

## Troubleshooting

### "Authentication required"
- Verify your API key is valid
- Check header name is `prompts_api_key` or `prompts-api-key`
- Regenerate key if expired

### "Skill not found"
- Verify skillId is correct
- Check if skill is private and you don't own it
- Ensure skill is not unlisted or deleted
- Confirm skill type is "SKILL" (not TEXT/IMAGE/etc)

### Comment not appearing
- Check if skill comments feature is enabled in config
- Verify you're looking at the correct skill page
- Comments may be shadow-banned if flagged by admin

## Branding Note

For s8promptbar deployments:
- Endpoint: `https://s8promptbar.vercel.app/api/mcp`
- User-facing strings preserve prompts.chat MCP behavior
- Links in responses use `prompts.chat` domain per spec
