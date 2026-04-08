# Internal Hack Feature - UI Screenshots Guide

## How to Test the Feature Visually

Since we don't have a running database in this environment, here's what you'll see when you test the feature locally:

### 1. Navigate to `/prompts/new`

**Default View (Regular Prompt Mode):**
```
┌─────────────────────────────────────────────────────┐
│  ℹ️  This platform doesn't run or execute prompts  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Create Prompt                              [Toggle] │
│ Create a prompt for the community                   │
└─────────────────────────────────────────────────────┘

Create Prompt                          [Private: OFF]
────────────────────────────────────────────────────────
```

### 2. Toggle to Internal Hack Mode

Click the toggle switch. The URL changes to `/prompts/new?mode=internal-hack`

**Internal Hack Mode View:**
```
┌─────────────────────────────────────────────────────┐
│  ℹ️  This platform doesn't run or execute prompts  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Create Solution8 Internal Hack             [Toggle] │
│ Create internal documentation for Solution8 team    │
└─────────────────────────────────────────────────────┘

Create Solution8 Internal Hack
────────────────────────────────────────────────────────
(No private toggle shown)
```

### 3. Form Differences

**Regular Mode:**
- Title field
- Description field
- Category dropdown
- Tags selector
- Content editor (Text/Structured options)
- Contributors search (all users)
- Private toggle ✅
- "What your prompt will produce" section ✅
- Media upload sections
- Workflow link ✅

**Internal Hack Mode:**
- Title field
- Description field
- Category dropdown
- Tags selector
- Content editor (Defaults to YAML structured format)
- **Markdown Preview toggle (Edit/Preview)** ⭐
- Contributors search (admin users only) ⭐
- Private toggle ❌ (hidden, always public)
- "What your prompt will produce" section ❌ (hidden)
- Media upload sections
- Workflow link ❌ (hidden)

### 4. Markdown Preview Feature

When in Internal Hack mode with YAML format:

**Edit Mode:**
```
┌─────────────────────────────────────────────────────┐
│ Markdown Preview          [Edit] [Preview]          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ # My Internal Hack                                   │
│                                                      │
│ This is **markdown** content.                        │
│                                                      │
│ - Item 1                                            │
│ - Item 2                                            │
└─────────────────────────────────────────────────────┘
```

**Preview Mode (click Preview tab):**
```
┌─────────────────────────────────────────────────────┐
│ Markdown Preview          [Edit] [Preview]          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ # My Internal Hack                                   │
│                                                      │
│ This is **markdown** content.                        │
│                                                      │
│ • Item 1                                            │
│ • Item 2                                            │
└─────────────────────────────────────────────────────┘
(Rendered markdown with proper formatting)
```

### 5. Contributors Search (Admin Only)

In Internal Hack mode, when searching for contributors:

**Search Input:**
```
┌─────────────────────────────────────────────────────┐
│ Contributors                                         │
│ Other users who helped write this prompt            │
│                                                      │
│ 🔍 [Search by username...]                          │
└─────────────────────────────────────────────────────┘
```

**Results (Admin Only):**
Only users from `ADMIN_USERNAMES` env var OR users with `role: ADMIN` appear:
```
┌─────────────────────────────────────────────────────┐
│ @admin1     Admin User One                          │
│ @admin2     Admin User Two                          │
└─────────────────────────────────────────────────────┘
```

(Regular users like @user123 won't appear in search results)

## Key Visual Differences Summary

| Feature | Regular Mode | Internal Hack Mode |
|---------|-------------|-------------------|
| Headline | "Create Prompt" | "Create Solution8 Internal Hack" |
| Private Toggle | Visible | Hidden |
| Default Format | Text | YAML (Structured) |
| Markdown Preview | No | Yes (Edit/Preview toggle) |
| "What your prompt will produce" | Visible | Hidden |
| "Workflow Link" | Visible | Hidden |
| Contributors Search | All users | Admin users only |
| URL | `/prompts/new` | `/prompts/new?mode=internal-hack` |

## Testing Steps

1. Set up `.env` with admin usernames:
   ```bash
   ADMIN_USERNAMES="testadmin,admin2"
   ```

2. Create test users in database (if testing contributor search):
   - Regular user: `testuser` with `role: USER`
   - Admin user: `testadmin` with `role: USER` (matches ENV)
   - DB Admin: `dbadmin` with `role: ADMIN`

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Open browser to `http://localhost:3000/prompts/new`

5. Test toggle:
   - Click toggle switch
   - Verify URL changes to `?mode=internal-hack`
   - Verify headline changes
   - Verify private toggle disappears

6. Test markdown preview:
   - Write some markdown in content editor
   - Click "Preview" tab
   - Verify markdown renders correctly
   - Click "Edit" tab to return to editing

7. Test contributor search:
   - Search for "test"
   - In regular mode: both `testuser` and `testadmin` appear
   - Toggle to internal hack mode
   - Search for "test"
   - Only `testadmin` appears (+ `dbadmin` if searching "admin")

8. Test form submission:
   - Fill out form in internal hack mode
   - Click "Create Prompt"
   - Verify it saves with `isPrivate: false`

## Expected Behavior

✅ **Toggle Persistence**: URL parameter persists across page refreshes
✅ **Admin Filtering**: Only admin users appear in contributor search
✅ **Markdown Preview**: Toggle between edit and preview modes
✅ **Form Defaults**: YAML format auto-selected
✅ **Hidden Sections**: Private toggle, output section, workflow link all hidden
✅ **Data Storage**: Saved to database like regular prompts (with isPrivate=false)
