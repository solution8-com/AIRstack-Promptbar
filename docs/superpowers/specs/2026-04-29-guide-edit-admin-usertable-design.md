# Design Specification: Guide Edit Flow, Admin User Table Navigation & Guide Comments
**Date:** 2026-04-29  
**Status:** Design Phase  
**Related Bugs:** Guide edit limitations, Admin user table UX, Guide commenting

---

## Overview

This specification covers three independent features:

1. **Bug #1:** Create a dedicated guide edit flow with proper character limits and guide-specific fields
2. **Bug #2:** Make usernames clickable in the admin user management table for direct navigation
3. **Bug #3:** Add commenting capability to AI guides (reusing existing platform comment system)

All features integrate into the existing prompts.chat platform without requiring database migrations.

---

## Bug #1: Dedicated Guide Edit Flow

### Problem Statement

Currently, editing a guide redirects to `/prompts/[id]/edit`, which uses `PromptForm`—a component designed for prompts. This causes several issues:

- **500-character content limit** (designed for short prompts, not guides)
- **Prompt-specific fields** that don't apply to guides (media upload, requires media switch, prompt type dropdown)
- **Misleading UI elements** (variable warnings, "what will your prompt produce" section, test workflow link, "Learn How To Write Effective Prompts" link, private toggle)
- **Headline says "Edit Prompt"** instead of "Edit Guide"

### Solution

Create a dedicated guide edit route and form component that:
- Provides a 20,000 character limit on guide content
- Shows only guide-relevant fields
- Uses the same backend API (no new endpoint needed)
- Allows retroactive category assignment
- Preserves the guide creation flow untouched

### Design Details

#### Routes & Pages

**New Route:** `/guides/[id]/edit/page.tsx`

```
src/app/guides/[id]/edit/
  └── page.tsx              (Server component, new)
```

**Modified Route:** `/guides/[id]/page.tsx`

- Update edit button link: `href={/guides/${guide.id}/edit}` (was `/prompts/${id}/edit`)

#### Components

**New Component:** `GuideEditForm.tsx`

- **Location:** `src/components/guides/guide-edit-form.tsx`
- **Type:** Client component (`"use client"`)
- **Purpose:** Dedicated form for editing guides
- **Basis:** Clone structure from `PromptForm` but remove all prompt-specific logic

**Form Fields:**

| Field | Type | Constraints | Behavior |
|-------|------|-------------|----------|
| Title | Text Input | Required, max 200 chars | Current behavior |
| Description | Text Input | Optional, max 500 chars | Current behavior |
| Content | Textarea | Required, max 20,000 chars | Enforce at submission; allow unlimited if existing entry >20k |
| Category | Select/Dropdown | Optional | New for guides; allow retroactive assignment |
| Tags | Tag Selector | Optional | Keep existing tags, allow add/remove |
| Contributors | Contributor Selector | Read/write | Keep existing behavior |

**Removed Fields:**
- Media URL / Media Upload switch
- Requires Media Upload toggle
- Required Media Type dropdown
- Required Media Count
- Prompt type selector (TEXT/IMAGE/VIDEO/etc.)
- Structured Format (JSON/YAML)
- Best With Models dropdown
- Best With MCP selector
- Workflow Link field
- Private toggle
- Variable pattern warning system
- "What will your prompt produce" preview section

**UI Elements:**

- **Headline:** "Edit Guide" (not "Edit Prompt")
- **Helper Links:** Remove "Learn How To Write Effective Prompts" link from top
- **Preview Button:** Keep guide preview functionality
- **Submit Button:** "Save Guide" or "Update Guide"
- **Error Handling:** Maintain existing error display

#### Data Flow

```
GET /guides/[id]/edit
  ↓
Fetch guide from DB (include tags, contributors, category)
  ↓
Pass to GuideEditForm as initialData
  ↓
User edits fields
  ↓
Form validation (20k char limit check)
  ↓
POST /api/prompts (existing endpoint)
  ├─ Body: { title, description, content, tagIds, categoryId, contributorIds, type: "GUIDE" }
  └─ API ignores prompt-specific fields if not present
  ↓
Redirect to /guides/[id]
```

#### Character Limit Behavior

**For new/edited guides:**
- Textarea has `maxLength={20000}`
- Form submission blocked if >20,000 chars
- Error message: "Guide content cannot exceed 20,000 characters"

**For existing guides with >20k content:**
- Textarea allows editing without enforcement
- Detection: Check `content.length > 20000` on load
- If true: Remove `maxLength` attribute from textarea
- Allow save regardless of final length (user can add more or reduce)

#### Authorization

- Only guide author + admin can access `/guides/[id]/edit`
- Existing auth logic from prompt edit applies (copy it)

#### Backward Compatibility

- **Create flow unchanged:** `/guides/new` still uses `GuideForm` (no category field)
- **Existing guides:** Retain all data; category assignment is optional
- **Old edit links:** If any hardcoded `/prompts/{id}/edit` links exist for guides, they will break—will be caught in testing

---

## Bug #2: Admin User Table Clickable Usernames

### Problem Statement

In the admin user management table, viewing a user's profile requires:
1. Check a checkbox next to the username
2. Click a "Show the user page" button

This is cumbersome for quick inspection.

### Solution

Make usernames in the user management table directly clickable, linking to the user's profile page.

### Design Details

#### Scope

**Only applies to:** The user management admin table (e.g., `/admin/users` or similar)
- Username column entries become `<Link>` components
- No changes to other admin tables or user display areas

#### Navigation Behavior

- **Normal click:** Navigate to `/{username}` in the same tab
- **Middle click:** Browser default (typically opens in new tab)—no special handling needed

#### Implementation

**Component:** Admin user management table component (location TBD during implementation exploration)

**Change:** Replace username cell text with:

```jsx
<Link href={`/${user.username}`}>
  {user.username}
</Link>
```

**Styling:** Use standard link appearance (inherited from app's link styles); no special visual treatment needed

#### Data Requirements

- User object must have `username` property
- User profile route must be `/{username}` (confirmed in codebase)

#### No Breaking Changes

- Checkbox and "Show user page" button behavior unchanged
- Both methods of navigation remain available
- No database changes needed

---

## Bug #3: Guide Comments

### Problem Statement

Currently, guides have no commenting capability. Users cannot discuss, ask questions, or provide feedback on guides. This limits community engagement and knowledge sharing.

### Solution

Add commenting functionality to guides by reusing the existing platform comment system (already implemented for prompts). Comments will be:
- Visible only to logged-in users
- Limited to 1,000 characters per comment
- Editable and deletable by comment author
- Support nested replies (leveraging existing system)
- Display comment count in guide header (alongside upvote and edit buttons)

### Design Details

#### Routes & Pages

**Modified Route:** `/guides/[id]/page.tsx`

- Add `<CommentSection>` component (existing component, already used on prompts)
- Pass guide ID as `promptId` parameter (guides stored as prompts with `type: "GUIDE"`)
- Display comment count in header next to upvote and edit indicators

#### Components

**Existing Component:** `CommentSection` (src/components/comments/comment-section.tsx)

- No new component needed; reuse existing system
- Already supports:
  - Comment creation, edit, delete
  - Nested replies (parentId support)
  - Vote scoring
  - Admin flagging
  - Character limits (enforced in CommentForm)

**Implementation Steps:**

1. Import `CommentSection` in `/guides/[id]/page.tsx`
2. Set `maxLength={1000}` in comment form for guide comments (already supports this)
3. Pass guide ID as `promptId` parameter
4. Add comment count display in guide header
5. Display CommentSection below guide content (same placement as prompts)

#### API Integration

**Existing Endpoint:** `/api/prompts/{promptId}/comments`

- Guides use the same endpoint as prompts (guides are stored as type="GUIDE" in prompts table)
- No new API endpoints needed
- Authentication: Comments visible only to logged-in users (enforced by existing API)

#### Data Flow

```
GET /guides/[id]
  ↓
Fetch guide + comment count from DB
  ↓
Render guide content
  ↓
Load <CommentSection promptId={guide.id} />
  ↓
CommentSection fetches from /api/prompts/{guide.id}/comments
  ↓
Display comments with 1000-char limit
  ↓
User can comment, edit, delete, reply (existing lifecycle)
```

#### Comment Display

**Location:** Below guide content on `/guides/[id]` page

**Header Integration:** Comment count displayed in guide header:
```
[Upvote Button] [Comment Count Icon + Count] [Edit Button]
```

**Access Control:**
- View: Logged-in users only
- Post: Logged-in users only
- Edit: Comment author or admin
- Delete: Comment author or admin

#### Character Limit

- **Enforcement:** Existing CommentForm component respects `maxLength={1000}`
- **UI:** Character counter shown in form (existing behavior)
- **Validation:** Form rejects submission if >1000 characters

#### Backward Compatibility

- Existing guides without comments continue to work
- Comment section loads empty for guides created before this feature
- No data migration needed (comments table already exists)

---

## Testing Strategy

### Bug #1 Tests

**Character Limit Enforcement:**
- Test: Submit guide with 20,001 characters → form rejects with error message
- Test: Load existing guide with 25,000 characters → textarea allows editing without limit enforcement

**Field Visibility:**
- Test: All prompt-specific fields absent (media upload, private toggle, etc.)
- Test: All guide fields present (title, description, content, category, tags, contributors)
- Test: "Edit Guide" headline displayed

**Form Submission:**
- Test: Valid guide save redirects to `/guides/[id]`
- Test: API request includes `type: "GUIDE"` and guide-specific fields only

**Authorization:**
- Test: Non-author cannot access `/guides/[id]/edit` (redirects to guide view or 403)

### Bug #2 Tests

**Link Navigation:**
- Test: Click username in user table → navigates to correct user profile (`/{username}`)
- Test: Username renders as a clickable link (not plain text)

### Bug #3 Tests

**Comment Display:**
- Test: Comment section appears below guide content on `/guides/[id]`
- Test: Comment count displays in guide header next to upvote/edit buttons
- Test: Comments only visible to logged-in users (unauthenticated users see prompt to log in)

**Character Limit:**
- Test: Submit comment with 1,001 characters → rejected with error
- Test: Submit comment with exactly 1,000 characters → saved successfully

**Comment Lifecycle:**
- Test: Logged-in user can create a comment on a guide
- Test: Comment author can edit their own comment
- Test: Comment author can delete their own comment
- Test: Non-author cannot edit/delete other users' comments
- Test: Admin can edit/delete any comment

**Nested Replies:**
- Test: User can reply to a comment (creates nested comment with parentId)
- Test: Deleting parent comment deletes all nested replies (existing system behavior)

---

## Side Effects & Considerations

### Data Integrity

- **Guides with no category:** Remain valid; category is optional in edit
- **Existing long guides:** Can be edited; length limit bypassed if content already >20k
- **No data loss:** All existing guide data preserved; only UI differs

### Performance

- No new API endpoints (reuses existing `/api/prompts`)
- No database queries added
- Link rendering in user table is lightweight

### Future Extensions

- If guides gain more features (media, structured formats, etc.), `GuideEditForm` can be extended independently
- Category field can be required in the future without affecting existing guides

---

## Files Affected

### New Files
- `src/app/guides/[id]/edit/page.tsx` (Bug #1)
- `src/components/guides/guide-edit-form.tsx` (Bug #1)

### Modified Files
- `src/app/guides/[id]/page.tsx` (Bug #1: edit button link; Bug #3: add CommentSection)
- Admin user table component (Bug #2, location TBD)

### No Changes Needed
- Database schema
- API endpoints
- Guide creation flow (`/guides/new`)
- Comment components (existing system reused)

---

## Rollout Notes

- **Database migration:** Not required (all features use existing schema)
- **API changes:** None (existing `/api/prompts` and `/api/prompts/{id}/comments` handle all features)
- **Breaking changes:** None
  - Old edit links for guides will 404 (caught in testing)
  - Comment section will load empty for guides with no comments
  - No impact on existing guide viewing or creation
- **Testing scope:** Three independent features; can be tested in parallel
- **Deployment order:** No dependencies between bugs; can deploy in any order

---

## Side Effects & Considerations (Bug #3)

### Data Integrity
- **Guides with no comments:** Remain valid; section loads empty
- **Comment system conflict:** No conflict; reusing proven system from prompts
- **No data loss:** All existing guides and comments preserved

### Performance
- **Comment loading:** Lazy-loaded via existing API (no impact on initial guide load)
- **Comment count:** Fetched with guide query (one additional DB lookup)
- **Database:** Existing comments table supports this (no new indexes needed)

### Future Extensions
- Comment notifications (already implemented for prompts; can extend to guides)
- Comment moderation (existing admin tools apply)
- Comment search (existing comment search applies to guides automatically)

---

## Open Questions (None)

All clarifications resolved with user.
