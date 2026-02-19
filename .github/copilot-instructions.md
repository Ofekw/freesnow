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

## Testing responsibility
- For any code changes, ensure that the existing test suite passes without modifications and there are unit tests covering the changed code paths and scenarios.
- Do not modify existing tests unless explicitly asked. If existing tests fail due to the change, analyze whether the failure is expected and if the test should be updated or if the code change should be adjusted and the tests found a real regression.
- If a task requires new features or significant changes, add new tests alongside the feature change if the scenario is not covered by existing changes.

## Validation workflow
- Use Bun tooling only for install and script execution.
- Never use `node`, `npm`, or `npx` commands in this repository.
- Validate changes with the existing project scripts:
  - `bun run lint`
  - `bun run build`
  - `bun run test`
- If `bun run test` reports no test files, treat lint/build as the required baseline checks for the task.
