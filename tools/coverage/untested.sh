#!/bin/bash
# untested.sh <report>...: the modules of tools/ that no test loads, by the lcov reports of the
# tests of tools/ (R48). A module that no test loads is in no report at all, and codecov/patch
# would never count its lines, so the script fails on any module of tools/ that none of the
# reports names, and names each. `just coverage` runs it on the one report of all the tests, and
# CI, whose jobs run the tests in parts, on the reports of every part together: a module that one
# part alone loads is in that part's report alone (RUN.md, T166). It runs from the repository's
# root, in the toolchain stage or on the runner itself: git, sed, sort and comm are all it takes.
set -euo pipefail
export LC_ALL=C

if [ $# -eq 0 ]; then
    echo "untested.sh: name the lcov reports" >&2
    exit 2
fi
for report in "$@"; do
    if [ ! -f "$report" ]; then
        echo "untested.sh: ${report}: no such report" >&2
        exit 2
    fi
done
# Both lists first, so that a git or a sed that fails stops the script rather than empty a list.
modules=$(git ls-files --cached --others --exclude-standard -- 'tools/*.mjs' | grep -v '/test/')
reported=$(sed -n 's/^SF://p' "$@")
missing=$(comm -23 <(sort -u <<< "$modules") <(sort -u <<< "$reported"))
if [ -n "$missing" ]; then
    echo "untested.sh: no test loads these modules of tools/, so codecov/patch would never count their lines:" >&2
    echo "$missing" >&2
    exit 1
fi
