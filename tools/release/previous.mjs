// The release before, as the checks that compare with it find it: buf breaking of contracts-check
// (R83; tools/contracts/buf.mjs), legal.in-force-unchanged of legal-check (R130;
// tools/legal/main.mjs) and consent-age.ages-kept of consent-age-check (R134;
// tools/consent-age/main.mjs). It is the newest release tag in the history of HEAD, other than a
// tag of HEAD itself — unless the working tree changes what the check compares: what it would
// commit comes after HEAD, so a release of HEAD is the previous one then (the amendment of
// 2026-11-04 to R83). spec's own history holds every release, so no file of a release is needed.

import { newestRelease } from "./version.mjs";
import { git } from "../shared.mjs";

// The tag of the release before HEAD in the repository at root, as the opening says, with paths
// what the check compares, or undefined when HEAD descends from no release. A shallow clone has no
// tags to count from and is refused, as release-version refuses it.
export function previousReleaseTag(root, paths) {
  if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() === "true") {
    throw new Error("a shallow clone has no tags to find the previous release by; fetch the whole history");
  }
  const changed = git(root, ["status", "--porcelain", "--", ...paths]).trim() !== "";
  const tags = git(root, ["tag", "--merged", "HEAD", ...(changed ? [] : ["--no-contains", "HEAD"]), "--list", "v*"]).split("\n").filter(Boolean);
  return newestRelease(tags);
}
