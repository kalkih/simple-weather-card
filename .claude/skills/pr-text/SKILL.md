---
name: pr-text
description: Write the pull request title and description for the current branch, from its commits and diff against master. Use when asked for a PR text, PR description or "pr tekst".
---

# Write a PR description

Claude can't open the PR here (no `gh`), so write the text for the user to
paste.

1. **Gather**: `git log --format='%h %s%n%b' master..HEAD`,
   `git diff --stat master`, and the diff itself where the commits don't
   explain the change. Note the branch prefix: it sets the PR label and the
   release notes category (`feat/` Features, `fix/` Fixes, `chore/` `ci/`
   `docs/` `refactor/` Maintenance).

2. **Write in English**, for a reviewer and for users reading the release
   notes later:
   - **Title**: short, imperative, what changes for the user.
   - Sections as they fit the change: `## What's new`, `## Fixes`,
     `## Changes`, `## Test environment`, `## CI`. Explain what was wrong
     before, not only what the code does now.
   - `## Breaking changes`: "None." if so, followed by visible differences
     users may notice.
   - `## Testing`: only what was actually run (`yarn typecheck`, `yarn lint`,
     `yarn build`, `yarn test` with the test count, tests failing against
     `master`). Mention manual testing in Home Assistant only if it was done
     in this session.
   - End with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

3. **Output** the title on its own line and the description in a code block
   wrapped in **four** backticks (the description often contains code
   blocks). If something wasn't tested, say so outside the block so it can
   be removed from the Testing section.
