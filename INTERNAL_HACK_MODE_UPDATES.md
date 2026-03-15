# Internal Hack Mode Updates

This document summarizes the changes made to the `/prompts/new` endpoint to improve the Internal Hack mode functionality.

## Changes Implemented

### 1. ✅ Removed Warning Modal
**Location:** `src/app/prompts/new/page.tsx`
- Removed the Alert component with "This platform doesn't run or execute prompts" message
- The warning modal is no longer displayed at the top of the page

### 2. ✅ Moved Mode Toggle Inline
**Location:** `src/components/prompts/prompt-form.tsx`
- Moved the mode toggle from a separate card to inline next to the h1 headline
- The toggle now appears directly next to "Create Prompt" or "Create Solution8 Internal Hack" heading
- Integrated as part of the form header for better UX

### 3. ✅ Added Tooltip with Info Icon
**Location:** `src/components/prompts/prompt-form.tsx`
- Added an info icon (ⓘ) next to the toggle
- Tooltip displays: "Click this toggle to switch to Solution8 Internal Hack mode"
- Uses Radix UI Tooltip component for consistent styling

### 4. ✅ Updated Title Placeholder
**Location:** `messages/en.json` and `src/components/prompts/prompt-form.tsx`
- Added new translation key: `titlePlaceholderHack`
- Normal mode: "Enter a title for your prompt"
- Internal Hack mode: "Enter a title for your hack"

### 5. ✅ Updated Description Placeholder
**Location:** `messages/en.json` and `src/components/prompts/prompt-form.tsx`
- Added new translation key: `descriptionPlaceholderHack`
- Normal mode: "Optional description of your prompt"
- Internal Hack mode: "Optional description of your hack"

### 6. ✅ Hidden Contributors Section
**Location:** `src/components/prompts/prompt-form.tsx`
- Contributors section is completely hidden when in Internal Hack mode
- Only visible in normal prompt creation mode

### 7. ✅ Changed Headline to "Hack Implementation Guide"
**Location:** `messages/en.json` and `src/components/prompts/prompt-form.tsx`
- Added new translation key: `inputTypeHack`
- Normal mode: "User Prompt"
- Internal Hack mode: "Hack Implementation Guide"

### 8. ✅ Added /MD Notation to Dropdown
**Location:** `src/components/prompts/prompt-form.tsx`
- Updated structured format dropdown
- Changed "YAML" to "YAML/MD" to indicate markdown support
- Makes it clear that YAML format supports markdown content

### 9. ✅ Default to YAML/Markdown
**Location:** `src/components/prompts/prompt-form.tsx` (line 456)
- Already implemented: `structuredFormat: isInternalHackMode ? "YAML" : ...`
- When in Internal Hack mode, the format defaults to YAML
- This allows for markdown content by default

### 10. ✅ Removed Media Upload Toggle
**Location:** `src/components/prompts/prompt-form.tsx`
- Media upload toggle is hidden in Internal Hack mode
- Only visible in normal prompt creation mode

### 11. ✅ Removed Variable Insert Functionality
**Location:** `src/components/prompts/prompt-form.tsx`
- VariableToolbar is hidden when in Internal Hack mode
- Applies to both structured (CodeEditor) and text (Textarea) editors
- Makes the editor simpler for markdown content

### 12. ✅ Added Preview Button with Caution Styling
**Location:** `src/components/prompts/prompt-form.tsx`
- Added a "Preview" button between "Cancel" and "Publish Your Hack"
- Only appears in Internal Hack mode
- Styled with caution-tape aesthetic: `bg-gradient-to-r from-amber-500/20 via-black to-amber-500/20`
- Has amber border for visual emphasis
- Scrolls to markdown preview section when clicked

### 13. ✅ Changed Button Text
**Location:** `messages/en.json` and `src/components/prompts/prompt-form.tsx`
- Added new translation key: `createButtonHack`
- Normal mode: "Create"
- Internal Hack mode: "Publish Your Hack"

## Files Modified

1. **src/app/prompts/new/page.tsx**
   - Removed Alert and ModeToggle components
   - Removed unused imports

2. **src/components/prompts/prompt-form.tsx**
   - Added inline mode toggle with tooltip
   - Implemented conditional UI elements based on `isInternalHackMode`
   - Added preview button with caution styling
   - Removed variable toolbar in Internal Hack mode
   - Updated placeholders and labels conditionally

3. **messages/en.json** (and es, fr, de, zh, ja, tr)
   - Added `titlePlaceholderHack`
   - Added `descriptionPlaceholderHack`
   - Added `inputTypeHack`
   - Added `createButtonHack`

## Testing

Build Status: ✅ **PASSING**
```bash
npm run build
# Build completes successfully with no errors
```

Lint Status: ✅ **PASSING**
```bash
npm run lint
# Only pre-existing warnings, no new issues
```

## Usage

To access Internal Hack mode:
1. Navigate to `/prompts/new`
2. Click the toggle switch next to the "Create Prompt" heading
3. The URL will update to `/prompts/new?mode=internal-hack`
4. The form will show all the Internal Hack mode customizations

Or directly visit: `/prompts/new?mode=internal-hack`

## Visual Changes

### Normal Mode
- Standard "Create Prompt" heading
- Warning alert at top
- Full form with all options
- Contributors section visible
- Variable insert toolbar visible
- Media upload toggle visible

### Internal Hack Mode
- "Create Solution8 Internal Hack" heading with inline toggle and tooltip
- No warning alert
- Simplified form
- Contributors section hidden
- Variable insert toolbar hidden
- Media upload toggle hidden
- "Hack Implementation Guide" instead of "User Prompt"
- YAML/MD format default
- Preview button with caution styling
- "Publish Your Hack" button

## Implementation Notes

- All changes are backward compatible
- Normal prompt creation mode is unaffected
- Translation keys added to all supported languages (English values, ready for localization)
- No database migrations required
- No breaking changes to existing functionality
