---
name: verify
description: Run every check for the card (typecheck, lint, build, smoke tests, Prettier on changed docs) and confirm that new tests fail against master. Use before committing, before writing a PR, or when asked to verify a change.
---

# Verify a change

Run the checks in order and stop at the first failure, showing its output.

1. **Checks**

   ```bash
   yarn typecheck && yarn lint && yarn build && yarn test
   ```

   The smoke tests load the built bundle, so `yarn build` must run before
   `yarn test`.

2. **Docs and config**: run `yarn prettier --check` on markdown and JSON
   files changed on the branch (`git diff --name-only master -- '*.md' '*.json'`).

3. **New tests must fail against `master`.** If `test/` changed on the branch,
   build `master` in a temporary worktree and run the branch's tests
   (the whole `test/` folder, including `helpers.mjs`) against it:

   ```bash
   WT="$(mktemp -d)/master"
   git worktree add -q "$WT" master \
     && ln -s "$PWD/node_modules" "$WT/node_modules" \
     && rm -rf "$WT/test" && cp -R test "$WT/test" \
     && (cd "$WT" && node_modules/.bin/webpack >/dev/null && node --test test/*.test.mjs)
   git worktree remove --force "$WT"
   ```

   Every test added or changed on the branch should fail there, and every
   other test should pass. A new test that passes on `master` doesn't test
   the change; say so and fix the test. Tests changed on purpose (for
   example a new expected format) also fail there; name them.

4. **Report** in a few lines: what passed (with test counts), what failed
   (with output), and what wasn't checked. These checks don't render the card
   in Home Assistant, so say that a visual check in the test environment
   (`yarn ha:up`) is still needed when the change is visible.
