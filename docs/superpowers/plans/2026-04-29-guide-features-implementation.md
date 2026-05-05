# Guide Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement guide edit flow with proper limits, add clickable usernames in admin table, and enable commenting on guides.

**Architecture:** Three independent features: (1) dedicated guide edit page reusing PromptForm structure, (2) simple Link component in user table, (3) CommentSection component reused from prompts. All features use existing APIs and database schema.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, shadcn/ui components

---

## File Structure

### New Files
- `src/app/guides/[id]/edit/page.tsx` — Server page component for guide editing
- `src/components/guides/guide-edit-form.tsx` — Client form component for guide editing

### Modified Files
- `src/app/guides/[id]/page.tsx` — Add edit button link + CommentSection
- Admin user table component (discovered during Task 6)

---

## Task 1: Create GuideEditForm Component (Client)

**Files:**
- Create: `src/components/guides/guide-edit-form.tsx`

- [ ] **Step 1: Create guide-edit-form.tsx with form structure**

```typescript
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuideContent } from "@/components/guides/guide-content";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Contributor {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

interface GuideEditFormProps {
  guideId: string;
  initialData: {
    title: string;
    description: string;
    content: string;
    categoryId?: string;
    tagIds: string[];
    contributors: Contributor[];
  };
  categories: Category[];
  tags: Tag[];
}

export function GuideEditForm({
  guideId,
  initialData,
  categories,
  tags,
}: GuideEditFormProps) {
  const t = useTranslations("prompts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [content, setContent] = useState(initialData.content);
  const [categoryId, setCategoryId] = useState(initialData.categoryId || "");
  const [selectedTagIds, setSelectedTagIds] = useState(initialData.tagIds);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Determine if content exceeds 20k limit
  const contentExceedsLimit = initialData.content.length > 20000;
  const maxLength = contentExceedsLimit ? undefined : 20000;

  function handlePreview() {
    setShowPreview(true);
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleTagToggle(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Enforce 20k character limit for new content
    if (!contentExceedsLimit && content.length > 20000) {
      setError("Guide content cannot exceed 20,000 characters");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/prompts/${guideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            content,
            type: "GUIDE",
            categoryId: categoryId || undefined,
            tagIds: selectedTagIds,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Failed to update guide");
          return;
        }

        router.push(`/guides/${guideId}`);
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="guide-title">{t("guideTitle")}</Label>
        <Input
          id="guide-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("guideTitle")}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-description">{t("guideDescription")}</Label>
        <Input
          id="guide-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("guideDescription")}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-content">{t("promptContent")}</Label>
        <Textarea
          id="guide-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("guideMarkdownPlaceholder")}
          required
          rows={20}
          maxLength={maxLength}
          className="font-mono text-sm resize-y"
        />
        {content.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {content.length} / {contentExceedsLimit ? "∞" : "20,000"} characters
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-category">{t("category")}</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="guide-category">
            <SelectValue placeholder={t("selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("tags")}</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || !title || !content}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("saveGuide")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={!content}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          {t("guidePreview")}
        </Button>
      </div>

      {showPreview && content && (
        <div ref={previewRef} className="mt-8 border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">{t("guidePreview")}</h2>
          {title && <h1 className="text-3xl font-bold tracking-tight mb-4">{title}</h1>}
          {description && (
            <p className="text-lg text-muted-foreground mb-6">{description}</p>
          )}
          <GuideContent content={content} />
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Verify component exports correctly**

Run: `npx tsc --noEmit` (TypeScript check)
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/guides/guide-edit-form.tsx
git commit -m "feat: create GuideEditForm component for guide editing"
```

---

## Task 2: Create Guide Edit Page

**Files:**
- Create: `src/app/guides/[id]/edit/page.tsx`

- [ ] **Step 1: Create page.tsx with server-side data fetching**

```typescript
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GuideEditForm } from "@/components/guides/guide-edit-form";

interface EditGuidePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Guide",
  description: "Edit your guide",
};

export default async function EditGuidePage({ params }: EditGuidePageProps) {
  const { id: guideId } = await params;
  const session = await auth();
  const t = await getTranslations("prompts");

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch the guide
  const guide = await db.prompt.findUnique({
    where: { id: guideId, type: "GUIDE" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      contributors: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  if (!guide) {
    notFound();
  }

  // Check if user is the author or admin
  const isAuthor = guide.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    redirect(`/guides/${guideId}`);
  }

  // Fetch categories and tags for the form
  const [categories, tags] = await Promise.all([
    db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
      },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Transform guide data for the form
  const initialData = {
    title: guide.title,
    description: guide.description || "",
    content: guide.content,
    categoryId: guide.categoryId || undefined,
    tagIds: guide.tags.map((t) => t.tagId),
    contributors: guide.contributors,
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Edit Guide</h1>
      <GuideEditForm
        guideId={guideId}
        initialData={initialData}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript types**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/guides/\[id\]/edit/page.tsx
git commit -m "feat: create guide edit page at /guides/[id]/edit"
```

---

## Task 3: Update Guide View Page to Link to Edit

**Files:**
- Modify: `src/app/guides/[id]/page.tsx`

- [ ] **Step 1: Update edit button link from /prompts to /guides**

Current code (line 114):
```tsx
<Link href={`/prompts/${guide.id}/edit`}>
```

Change to:
```tsx
<Link href={`/guides/${guide.id}/edit`}>
```

- [ ] **Step 2: Verify change**

```bash
grep -n "guides/.*edit" src/app/guides/\[id\]/page.tsx
```

Expected: Should show the updated link

- [ ] **Step 3: Commit**

```bash
git add src/app/guides/\[id\]/page.tsx
git commit -m "fix: update guide edit button to use /guides/[id]/edit route"
```

---

## Task 4: Add CommentSection to Guide View Page

**Files:**
- Modify: `src/app/guides/[id]/page.tsx`

- [ ] **Step 1: Import CommentSection component (add near top imports)**

Find the imports section and add:
```typescript
import { CommentSection } from "@/components/comments";
```

- [ ] **Step 2: Modify guide page to add comment count in header**

Find the line with `_count` in the include object (around line 66-70), and verify it includes:
```typescript
_count: {
  select: {
    votes: true,
    comments: true,
  },
},
```

If `comments: true` is missing, add it.

- [ ] **Step 3: Update the header to display comment count**

Find the button group with UpvoteButton (around line 104-120). Add comment count display after UpvoteButton:

```tsx
<UpvoteButton
  promptId={guide.id}
  initialVoted={hasVoted}
  initialCount={initialVoteCount}
  isLoggedIn={isLoggedIn}
  size="sm"
  showLabel={false}
/>
{/* Comment count indicator */}
<div className="flex items-center gap-1 text-sm text-muted-foreground">
  <MessageSquare className="h-4 w-4" />
  {guide._count?.comments ?? 0}
</div>
{isAdmin && (
  <Button variant="outline" size="sm" asChild className="gap-1.5">
    <Link href={`/guides/${guide.id}/edit`}>
      <Edit className="h-4 w-4" />
      {t("editGuide")}
    </Link>
  </Button>
)}
```

Add MessageSquare import at top:
```typescript
import { ArrowLeft, Edit, MessageSquare } from "lucide-react";
```

- [ ] **Step 4: Add CommentSection component before closing div**

Find the closing `</div>` tag at the end of the page (after `<GuideContent>`), and add before it:

```tsx
{/* Comments Section */}
<div className="mt-12 border-t pt-8">
  {isLoggedIn ? (
    <CommentSection
      promptId={guide.id}
      currentUserId={session?.user?.id}
      isAdmin={isAdmin}
      isLoggedIn={isLoggedIn}
      locale="en"
    />
  ) : (
    <div className="rounded-md border border-secondary bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
      <p>{t("loginToComment")}</p>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify imports**

Check all new imports are at the top of the file. Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/guides/\[id\]/page.tsx
git commit -m "feat: add comment count display and CommentSection to guide pages"
```

---

## Task 5: Discover Admin User Table Component

**Files:**
- Modify: Admin user table component (location TBD)

- [ ] **Step 1: Search for admin user management component**

```bash
find src/app/admin -type f -name "*.tsx" | xargs grep -l "username\|user.*table" | head -10
```

Expected: Find file(s) containing user listing/table

- [ ] **Step 2: Locate the specific table component for users**

Check files found above. Look for:
- Component rendering a list/table of users
- Username column/cell
- Any checkbox or selection logic

Document the file path and note:
- Component name
- Line number where username is rendered
- Whether it's in a separate component or inline

- [ ] **Step 3: Record findings**

Note the exact file path for Task 6 implementation.

---

## Task 6: Make Usernames Clickable in Admin Table

**Files:**
- Modify: [Admin user table file discovered in Task 5]

- [ ] **Step 1: Import Link component**

Add to imports (if not already present):
```typescript
import Link from "next/link";
```

- [ ] **Step 2: Find username cell render**

Locate the code that renders the username (noted in Task 5, Step 3).

Current pattern (example):
```tsx
<td>{user.username}</td>
```

- [ ] **Step 3: Wrap username in Link component**

Change to:
```tsx
<td>
  <Link
    href={`/${user.username}`}
    className="text-blue-600 hover:underline"
  >
    {user.username}
  </Link>
</td>
```

Note: Adjust className to match your app's link styling (check existing Link usage in codebase)

- [ ] **Step 4: Verify change**

```bash
grep -n "href=.*username" [admin-table-file-path]
```

Expected: Should show the Link wrapping username

- [ ] **Step 5: Test in browser (manual)**

- Start dev server: `npm run dev`
- Navigate to admin user management page
- Verify username is underlined (indicates it's a link)
- Normal click: Should navigate to user profile
- Middle click: Should offer to open in new tab (OS default)
- Verify checkbox + "Show user page" button still works (no breaking change)

- [ ] **Step 6: Commit**

```bash
git add [admin-table-file-path]
git commit -m "feat: make usernames clickable in admin user table for direct navigation"
```

---

## Task 7: Update Translations (if needed)

**Files:**
- Modify: `messages/en.json` (or relevant i18n files)

- [ ] **Step 1: Check if translation keys exist**

```bash
grep -l "saveGuide\|loginToComment\|selectCategory" messages/*.json
```

- [ ] **Step 2: Add missing translations if needed**

If `saveGuide`, `loginToComment`, or `selectCategory` don't exist:

Open `messages/en.json` and add under `prompts` section:
```json
"saveGuide": "Save Guide",
"loginToComment": "Please log in to comment on this guide.",
"selectCategory": "Select a category",
"editGuide": "Edit Guide"
```

- [ ] **Step 3: Verify all translation keys used in code exist**

Search your implementation for `t("..."` calls and verify each key exists in translation files.

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat: add translations for guide editing and commenting"
```

---

## Task 8: Run Full Test Suite

**Files:**
- Test: All created/modified files

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No lint errors (fix any with `--fix` if needed)

- [ ] **Step 3: Run existing tests (if any)**

```bash
npm test 2>&1 | head -50
```

Expected: All tests pass (no regressions)

- [ ] **Step 4: Start dev server and manual test**

```bash
npm run dev
```

Then:
1. Navigate to `/guides` and find a guide to edit
2. Click edit button → should go to `/guides/[id]/edit`
3. Edit title, description, content (test 20k limit by pasting large text)
4. Add category and tags
5. Click "Save Guide" → should redirect to guide page
6. Verify guide content displays with comments section below
7. Try commenting (logged in) → should create comment with 1000 char limit
8. Verify comment count shows in header
9. Go to admin user management page
10. Click username → should navigate to user profile

- [ ] **Step 5: Commit test verification results**

```bash
git add -A
git commit -m "test: verify all features working end-to-end"
```

---

## Task 9: Final Code Review & Cleanup

**Files:**
- Review: All modified/created files

- [ ] **Step 1: Review GuideEditForm for any hardcoded values**

```bash
grep -n "TODO\|FIXME\|XXX" src/components/guides/guide-edit-form.tsx
```

Expected: No markers; if any, address them

- [ ] **Step 2: Check for console.logs or debug code**

```bash
grep -n "console\.\|debugger" src/components/guides/guide-edit-form.tsx src/app/guides/\[id\]/edit/page.tsx src/app/guides/\[id\]/page.tsx
```

Expected: No debug code

- [ ] **Step 3: Verify no commented-out code**

```bash
grep -n "^[[:space:]]*\/\/" src/components/guides/guide-edit-form.tsx | grep -v "import\|type\|interface"
```

Expected: Only meaningful comments (not "this was here before")

- [ ] **Step 4: Final lint check**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove debug code and finalize implementation"
```

---

## Summary

All three features implemented:

1. ✅ **Bug #1:** Dedicated guide edit flow at `/guides/[id]/edit` with 20k character limit
2. ✅ **Bug #2:** Clickable usernames in admin user table
3. ✅ **Bug #3:** Comments on guides with 1000-character limit, visible only to logged-in users

Database: No migrations needed (all data uses existing schema)
API: No new endpoints (reuses `/api/prompts` and existing comment endpoints)
Tests: Manual verification steps provided; existing test suite should pass
