---
name: release-notes
description: Write the user-facing summary for the next release, from the pull requests merged since the last release, and suggest the version bump. Use when asked for release notes or "release note".
---

# Write release notes

The Release workflow (Actions → Release → Run workflow) creates a draft with
GitHub's generated list of pull requests. This summary is pasted **above**
that list before publishing.

1. **Find what's new**:

   ```bash
   git fetch -q origin --tags
   LAST=$(git tag --list 'v*' --sort=-version:refname | command grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
   git log --format='%h %s' "$LAST..origin/master"
   ```

   PR numbers are in the merge or squash commit subjects (`#123`). Read each
   PR's description with the public API (no `gh` here):

   ```bash
   curl -s https://api.github.com/repos/I-Simen-I/simple-weather-card/pulls/123
   ```

   Also check the latest release (`.../releases/latest`) to be sure `$LAST`
   is really the latest published release, and not a draft.

2. **Suggest the bump**: `major` for breaking changes, `minor` for new
   features, `patch` for fixes only. Changes to docs, CI or the test
   environment alone don't need a release.

3. **Write in English, for users** of the card, not developers:
   - Only changes users can see or need to act on. Leave out CI, tests,
     refactoring, the test environment and dependency updates (the generated
     list shows those).
   - Sections as they fit: `## What's new` (with `###` per feature and a
     short YAML example where it helps), `## Fixes`, `## Changes`, and always
     `## Upgrading` ("No config changes needed." or what to change).
   - End with a line containing only `---`, which separates it from the
     generated list.

4. **Output** the bump and the summary in a code block wrapped in **four**
   backticks, so code blocks inside it survive copying. Remind the user to
   paste it above the generated list, not over it.
