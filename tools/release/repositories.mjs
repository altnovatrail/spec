// The numeric IDs GitHub gave the organization altnovatrail and each of its repositories, which
// release-verify holds a signature's certificate to (R77): Source Repository Identifier and
// Source Repository Owner Identifier. A repository's address changes when it is renamed, and its
// ID does not; a repository made anew under an old name gets a new ID. That is why the IDs are
// held here, in spec, rather than read from GitHub when a file is checked: read then, they would
// follow whatever repository has the name now.
//
// A new repository's ID comes in with the task of spec that makes it, after `gh repo create`
// (repositories 2.2): until then release-verify refuses the files of its releases.

export const ORGANIZATION = Object.freeze({ name: "altnovatrail", id: "344507087" });

// Read by `gh api orgs/altnovatrail/repos` on 2026-11-01.
export const REPOSITORIES = Object.freeze({
  ".github": "1425707459",
  api: "1425823147",
  app: "1425827763",
  canvas: "1425820257",
  engine: "1425816021",
  infra: "1425816333",
  "learner-model": "1425818897",
  "module-kit": "1425817249",
  modules: "1425775415",
  sim: "1425813986",
  "skill-map": "1425814799",
  spec: "1424771727",
  tutor: "1425813274",
});
