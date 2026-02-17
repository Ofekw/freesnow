# Copilot Default Instructions for FreeSnow

## Required context files
- At the start of every task, read `#file:history.md`.
- At the start of every task, read `#file:plan.md`.
- Treat both files as required project context before making decisions or code changes.

## Change logging requirement
- When a task introduces a **big change** (new feature, major refactor, architecture change, significant UX flow change, or notable behavior change), update `#file:history.md` in the same task.
- Add a concise entry that includes:
  - What changed
  - Why it changed
  - Key files/components affected
  - Any important follow-up notes
- Keep entries chronological and consistent with existing formatting.

## Scope discipline
- Do not add unrelated history notes for minor edits.
- Do not remove existing history content unless explicitly asked.
