# Internal Hack Feature Implementation Summary

## Overview
This implementation adds a toggle feature to the `/prompts/new` endpoint that allows switching between "Create Prompt" and "Create Solution8 Internal Hack" modes. The GitHub integration has been shelved as requested.

## What Was Implemented

### 1. Admin Configuration
- **Admin Utility Library** (`src/lib/admin.ts`):
  - `isUserAdmin(userId)`: Checks if a user is admin based on the database role
  - `getAdminUserIds()`: Gets all admin user IDs
  - `getAdminUsernames()`: Returns admin usernames from users with `role: ADMIN`
  - `syncAdminRoleFromLegacyEnv()`: Migrates legacy `S8_ADMINS` usernames into `role: ADMIN` on boot

**Current Admin Model**: The codebase uses the `UserRole` enum with `ADMIN` and `USER` values in the Prisma schema. Admin-only flows should rely on `role: ADMIN` in the database.

### 2. UI Components

#### Mode Toggle (`src/components/prompts/mode-toggle.tsx`)
- Switch component that toggles between "Create Prompt" and "Create Solution8 Internal Hack"
- Updates URL with `?mode=internal-hack` parameter
- Mode persists across page reloads via URL

#### Markdown Preview (`src/components/prompts/markdown-preview.tsx`)
- Toggle between Edit and Preview modes (not live preview as requested)
- Uses `react-markdown` with GitHub Flavored Markdown support
- Only shown in Internal Hack mode

### 3. Form Modifications

When in Internal Hack mode (`?mode=internal-hack`):

#### Hidden Elements:
- Private toggle (internal hacks are always public)
- "What your prompt will produce" section
- "Test Workflow Link" section

#### Default Values:
- Type: TEXT with YAML structured format
- Private: Always false (public)

#### Modified Behavior:
- Contributor search filters to admin users only (via `adminOnly=true` query parameter)
- Headline changes to "Create Solution8 Internal Hack"
- Markdown preview shown below content editor

### 4. Backend Changes

#### API Endpoint (`src/app/api/users/search/route.ts`)
- Added `adminOnly` query parameter
- When `adminOnly=true`, filters users with `role: ADMIN` in the database

#### Page Component (`src/app/prompts/new/page.tsx`)
- Reads `mode` from search params
- Passes `isInternalHackMode` flag to PromptForm
- Renders ModeToggle component

### 5. Translation Strings (`messages/en.json`)
- `createInternalHack`: "Create Solution8 Internal Hack"
- `markdownPreview`: "Markdown Preview"
- `edit`: "Edit"
- `preview`: "Preview"
- `noContentToPreview`: "No content to preview"

## How to Use

### Setting Up Admins

Set the relevant users to `role: ADMIN` in the database or via the Admin UI.

### Accessing Internal Hack Mode

1. Navigate to `/prompts/new`
2. Toggle the switch at the top of the page
3. The URL will update to `/prompts/new?mode=internal-hack`
4. You can bookmark or share this URL to go directly to Internal Hack mode

### Form Behavior in Internal Hack Mode

- **Content Editor**: Defaults to YAML structured format for markdown
- **Markdown Preview**: Toggle between Edit/Preview to see rendered markdown
- **Contributors**: Search only shows admin users
- **Privacy**: Always public (no toggle shown)
- **Output Section**: Hidden (not needed for internal docs)
- **Workflow Link**: Hidden (not needed for internal docs)

### Creating an Internal Hack

1. Toggle to Internal Hack mode
2. Enter title and description
3. Write content in YAML/Markdown format
4. Use Preview toggle to see rendered output
5. Add admin contributors if needed
6. Click "Create Prompt"
7. Saved to database like regular prompts (with `isPrivate=false`)

## Testing

### Unit Tests
- Created comprehensive tests for admin utilities (`src/__tests__/lib/admin.test.ts`)
- All 13 tests pass ✅

### Manual Testing Checklist
To test the feature, you'll need to:
1. Ensure the relevant test users have `role: ADMIN`
2. Create test users in the database
3. Start dev server: `npm run dev`
4. Navigate to `http://localhost:3000/prompts/new`
5. Test toggle functionality
6. Test URL persistence (refresh page)
7. Test form defaults
8. Test markdown preview
9. Test admin-only contributor search
10. Test creating an internal hack

## Files Modified/Created

### Created:
- `src/lib/admin.ts` - Admin utility functions
- `src/components/prompts/mode-toggle.tsx` - UI toggle component
- `src/components/prompts/markdown-preview.tsx` - Preview component
- `src/__tests__/lib/admin.test.ts` - Unit tests

### Modified:
- `.env.example` - Documented database-role admin control
- `messages/en.json` - Added translation strings
- `src/app/prompts/new/page.tsx` - Added mode toggle and logic
- `src/components/prompts/prompt-form.tsx` - Conditional rendering for internal hack mode
- `src/components/prompts/contributor-search.tsx` - Added adminOnly prop
- `src/app/api/users/search/route.ts` - Added admin filtering

## What Was NOT Implemented (Shelved)

As requested, the following GitHub integration features were **shelved**:
- Creating branches in `solution8-com/S8-Utilities` repo
- Creating commits with sanitized folder structure
- Auto-generating README.md files in GitHub
- GitHub API integration
- Branch naming conventions
- Pull request creation

Internal hacks are simply stored in the database like regular prompts.

## Next Steps

If you want to add GitHub integration in the future, you would need to:
1. Add GitHub API credentials (Personal Access Token or GitHub App)
2. Install `@octokit/rest` package
3. Create new API endpoint `/api/internal-hacks` to handle GitHub operations
4. Modify the form submission to call this endpoint
5. Handle errors and show success/failure to user

But for now, this feature is complete as requested!
