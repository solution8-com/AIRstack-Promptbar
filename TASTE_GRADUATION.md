# TASTE Graduation (Analysis Only)

This document captures the deferred implementation plan for graduating a TASTE prompt into either SKILL or plain TEXT.

## Summary

- No database migration is required.
- `PromptType` already includes `SKILL` and `TEXT`.
- Existing prompt update APIs already support changing `type`.
- UI implementation is intentionally deferred.

## Proposed Product Flow

1. On the TASTE prompt detail page, show a **Graduate** action for:
   - Prompt owner
   - Admin users
2. Open a modal with two options:
   - Graduate as **SKILL**
   - Graduate as **plain Prompt (TEXT)**
3. Submit graduation via `PATCH /api/prompts/:id`:
   - `type: "SKILL"` for skill graduation
   - `type: "TEXT"` for plain prompt graduation
4. Refresh prompt detail to reflect new type-specific UI and capabilities.

## Data/Versioning Considerations

- Optionally create a `PromptVersion` entry when graduation occurs.
- Suggested version note format:
  - `Graduated from TASTE to SKILL`
  - `Graduated from TASTE to TEXT`
- If graduating to TEXT, remove or normalize any TASTE-specific metadata where applicable.

## Deferred Scope

- No Graduate button UI added yet.
- No graduation modal added yet.
- No graduation audit/version creation behavior added yet.
- This document is the tracked analysis artifact for future implementation.
