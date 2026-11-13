// The steps of reading the legal texts, one by one, on parts written here (legal/README.md,
// section 5): the schema of spec's own legal/, then the rules.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchemas, readSchema } from "../../format-check/schemas.mjs";
import { LEGAL_PART } from "../main.mjs";
import { RULES, fileOf, hasWhoWeAre, markdownProblem, namesOf, readingOf as readingOn, sameBytes } from "../reading.mjs";

const spec = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const validate = compileSchemas([readSchema(spec, "legal.schema.json", LEGAL_PART)]).validators.get("legal");

// The day the parts here are read on, after every day they put a version in force from but the
// days a test names.
const TODAY = "2026-12-15";
const readingOf = (validate, part, previous = null, { today = TODAY } = {}) => readingOn(validate, part, previous, { today });

const summary = () => ({ en: "The gist.", ru: "Суть." });
const inForce = (version, since = "2026-11-20") => ({ version, status: "in_force", in_force_since: since, summary: summary() });
const draft = (version) => ({ version, status: "draft", summary: summary() });
const setVersion = (version, status, notice = 1, form = 1) => ({
  version,
  status,
  ...(status === "in_force" ? { in_force_since: "2026-11-20" } : {}),
  notice: { text: "measure-notice", version: notice },
  form: { text: "measure-form", version: form },
});
const body = (title) => `# ${title}\n\nThe words.\n`;
// A version of the privacy policy, with its section "Who we are", which legal.operator wants.
const policy = () => "# Privacy policy\n\n## Who we are\n\nALT EdTech LLC, in Texas.\n";

// A part that every step accepts: a policy in force with a draft after it, and a set in force of a
// notice and a form in force. Each change is a function of the passport and the files.
function part(change = () => {}) {
  const passport = {
    format: 3,
    texts: {
      "privacy-policy": { place: "app", versions: [inForce(1), draft(2)] },
      "measure-notice": { place: "samples_page", versions: [inForce(1)] },
      "measure-form": { place: "form", versions: [inForce(1)] },
    },
    sets: { measure: { versions: [setVersion(1, "in_force")] } },
  };
  const files = {
    "texts/privacy-policy/1.md": policy(),
    "texts/privacy-policy/2.md": policy(),
    "texts/measure-notice/1.md": body("Measurement: notice"),
    "texts/measure-form/1.md": body("Measurement: form"),
  };
  change(passport, files);
  return { passport, files };
}

const refused = (refused_by, ...names) => ({ refused_by, names });

test("the rules are the text's, in its order", () => {
  assert.deepEqual(RULES, ["legal.files", "legal.versions", "legal.set-texts", "legal.markdown", "legal.operator", "legal.in-force-unchanged"]);
  assert.equal(fileOf("privacy-policy", 3), "texts/privacy-policy/3.md");
});

const none = { texts: {}, sets: {} };

test("a part that passes the schema and breaks no rule gives the current version of each text and set", () => {
  assert.deepEqual(readingOf(validate, part()), { current: { texts: { "measure-form": 1, "measure-notice": 1, "privacy-policy": 1 }, sets: { measure: 1 } }, next: none });
  // The highest version in force is current; a text or a set with none in force has none.
  const later = part((passport, files) => {
    passport.texts["privacy-policy"].versions = [inForce(1), inForce(2, "2026-12-01"), inForce(3, "2026-12-01"), draft(4)];
    files["texts/privacy-policy/3.md"] = policy();
    files["texts/privacy-policy/4.md"] = policy();
    passport.texts["terms-of-use"] = { place: "app", versions: [draft(1)] };
    files["texts/terms-of-use/1.md"] = body("Terms of use");
    passport.sets.measure.versions.push(setVersion(2, "draft"));
    passport.sets.other = { versions: [setVersion(1, "draft")] };
  });
  assert.deepEqual(readingOf(validate, later), { current: { texts: { "measure-form": 1, "measure-notice": 1, "privacy-policy": 3 }, sets: { measure: 1 } }, next: none });
  // A version in force applies from its day: before it, the one before is current and it is next,
  // and of two versions still to come the earlier is next. A set is read the same way.
  const ahead = part((passport, files) => {
    passport.texts["privacy-policy"].versions = [inForce(1), inForce(2, "2026-12-20"), inForce(3, "2027-01-10")];
    files["texts/privacy-policy/3.md"] = policy();
    passport.texts["measure-notice"].versions.push(inForce(2, "2026-12-20"));
    passport.texts["measure-form"].versions.push(inForce(2, "2026-12-20"));
    files["texts/measure-notice/2.md"] = body("Measurement: notice");
    files["texts/measure-form/2.md"] = body("Measurement: form");
    passport.sets.measure.versions.push({ ...setVersion(2, "in_force", 2, 2), in_force_since: "2026-12-20" });
  });
  const both = (current) => ({ texts: { "measure-form": current, "measure-notice": current, "privacy-policy": current }, sets: { measure: current } });
  assert.deepEqual(readingOf(validate, ahead), { current: both(1), next: { texts: { "measure-form": 2, "measure-notice": 2, "privacy-policy": 2 }, sets: { measure: 2 } } });
  assert.deepEqual(readingOf(validate, ahead, null, { today: "2026-12-19" }), readingOf(validate, ahead));
  assert.deepEqual(readingOf(validate, ahead, null, { today: "2026-12-20" }), { current: both(2), next: { texts: { "privacy-policy": 3 }, sets: {} } });
  assert.deepEqual(readingOf(validate, ahead, null, { today: "2027-01-10" }), { current: { ...both(2), texts: { ...both(2).texts, "privacy-policy": 3 } }, next: none });
  // A reading is on a day.
  // Two versions still to come on one day: the higher is next, as it becomes current that day.
  const sameDay = part((passport, files) => {
    passport.texts["privacy-policy"].versions = [inForce(1), inForce(2, "2026-12-20"), inForce(3, "2026-12-20"), inForce(4, "2027-01-10")];
    for (const n of [3, 4]) files[`texts/privacy-policy/${n}.md`] = policy();
  });
  assert.deepEqual(readingOf(validate, sameDay).next.texts, { "privacy-policy": 3 });
  for (const today of [undefined, "", "2026-12-1", "15.12.2026", 20261215, "2026-02-30", "2026-13-01"]) assert.throws(() => readingOn(validate, part(), null, { today }), /a reading is on a day, YYYY-MM-DD/);
  assert.throws(() => readingOn(validate, part(), null), /a reading is on a day/);
  // No previous release, or one with no legal/, holds legal.in-force-unchanged.
  assert.deepEqual(readingOf(validate, part(), null), readingOf(validate, part(), undefined));
});

test("the schema comes first, and names every path it refuses, once, in the order of code units", () => {
  const broken = part((passport) => {
    passport.texts["privacy-policy"].place = "website";
    passport.texts["measure-form"].title = "A form";
    delete passport.texts["measure-notice"].versions[0].summary.ru;
    passport.format = 4;
    // A file the passport does not name: the schema refuses first, whatever the rules would say.
  });
  broken.files["texts/other/1.md"] = "no heading";
  assert.deepEqual(readingOf(validate, broken), refused("schema", "format", "texts.measure-form.title", "texts.measure-notice.versions.0.summary.ru", "texts.privacy-policy.place"));
  // A version in force with no date, and a draft with one: an if is named by its then or its else.
  const dates = part((passport) => {
    delete passport.texts["privacy-policy"].versions[0].in_force_since;
    passport.texts["privacy-policy"].versions[1].in_force_since = "2026-11-21";
  });
  assert.deepEqual(readingOf(validate, dates), refused("schema", "texts.privacy-policy.versions.0.in_force_since", "texts.privacy-policy.versions.1"));
  // A name a map does not allow is named at the path it has.
  const id = part((passport) => {
    passport.texts["Privacy-Policy"] = passport.texts["privacy-policy"];
    delete passport.texts["privacy-policy"];
  });
  assert.deepEqual(readingOf(validate, id), refused("schema", "texts.Privacy-Policy"));
  assert.deepEqual(readingOf(validate, { passport: null, files: {} }), refused("schema", ""));
});

test("namesOf undoes the escapes of a JSON Pointer and names a missing or unknown field and a name a map refuses", () => {
  assert.deepEqual(
    namesOf([
      { keyword: "required", instancePath: "/texts/a", params: { missingProperty: "place" } },
      { keyword: "unevaluatedProperties", instancePath: "", params: { unevaluatedProperty: "a/b" } },
      { keyword: "pattern", instancePath: "/x~1y/z~0w", params: {} },
      { keyword: "pattern", instancePath: "/texts", propertyName: "Bad", params: {} },
      { keyword: "propertyNames", instancePath: "/texts", params: { propertyName: "Bad" } },
      { keyword: "propertyNames", instancePath: "/sets", params: { propertyName: "Other" } },
      { keyword: "if", instancePath: "/texts/a/versions/0", params: { failingKeyword: "then" } },
    ]),
    ["a/b", "sets.Other", "texts.Bad", "texts.a.place", "x/y.z~w"],
  );
});

test("legal.files: every version has its file, and every file under texts/ is a version", () => {
  assert.deepEqual(readingOf(validate, part((_, files) => delete files["texts/privacy-policy/2.md"])), refused("legal.files", "texts/privacy-policy/2.md"));
  const extra = part((_, files) => {
    files["texts/privacy-policy/3.md"] = policy();
    files["texts/cookie-policy/1.md"] = body("Cookie policy");
    files["texts/privacy-policy/01.md"] = body("Privacy policy");
    files["texts/notes.txt"] = "notes";
    delete files["texts/measure-form/1.md"];
  });
  assert.deepEqual(readingOf(validate, extra), refused("legal.files", "texts/cookie-policy/1.md", "texts/measure-form/1.md", "texts/notes.txt", "texts/privacy-policy/01.md", "texts/privacy-policy/3.md"));
});

test("legal.versions: 1, 2, 3… in order, every draft after the versions in force, and no date going back", () => {
  const numbered = (versions, files = []) =>
    part((passport, all) => {
      passport.texts["privacy-policy"].versions = versions;
      delete all["texts/privacy-policy/1.md"];
      delete all["texts/privacy-policy/2.md"];
      for (const n of files) all[`texts/privacy-policy/${n}.md`] = policy();
    });
  assert.deepEqual(readingOf(validate, numbered([inForce(1), inForce(3, "2026-12-01")], [1, 3])), refused("legal.versions", "texts.privacy-policy"));
  assert.deepEqual(readingOf(validate, numbered([inForce(2)], [2])), refused("legal.versions", "texts.privacy-policy"));
  assert.deepEqual(readingOf(validate, numbered([inForce(2), inForce(1)], [1, 2])), refused("legal.versions", "texts.privacy-policy"));
  assert.deepEqual(readingOf(validate, numbered([draft(1), inForce(2, "2026-12-01")], [1, 2])), refused("legal.versions", "texts.privacy-policy"));
  assert.deepEqual(readingOf(validate, numbered([inForce(1), inForce(2, "2026-11-19")], [1, 2])), refused("legal.versions", "texts.privacy-policy"));
  // Two versions in force on one day, and drafts one after another, are in order.
  assert.ok(readingOf(validate, numbered([inForce(1), inForce(2), draft(3), draft(4)], [1, 2, 3, 4])).current);
  const set = part((passport) => {
    passport.sets.measure.versions = [setVersion(1, "draft"), setVersion(2, "in_force")];
    passport.sets.other = { versions: [setVersion(2, "draft")] };
  });
  assert.deepEqual(readingOf(validate, set), refused("legal.versions", "sets.measure", "sets.other"));
});

test("legal.set-texts: a set names versions that exist, at the places of a notice and a form, in force when it is", () => {
  const set = (...versions) => part((passport) => (passport.sets.measure.versions = versions));
  assert.deepEqual(readingOf(validate, set(setVersion(1, "in_force", 1, 2))), refused("legal.set-texts", "sets.measure"));
  assert.deepEqual(readingOf(validate, set(setVersion(1, "draft", 2, 1))), refused("legal.set-texts", "sets.measure"));
  const unknown = part((passport) => (passport.sets.measure.versions[0].notice.text = "no-such-text"));
  assert.deepEqual(readingOf(validate, unknown), refused("legal.set-texts", "sets.measure"));
  // A text of another place: the notice is a form, or the form a text of app.
  const notice = part((passport) => (passport.sets.measure.versions[0].notice.text = "measure-form"));
  assert.deepEqual(readingOf(validate, notice), refused("legal.set-texts", "sets.measure"));
  const form = part((passport) => (passport.sets.measure.versions[0].form.text = "privacy-policy"));
  assert.deepEqual(readingOf(validate, form), refused("legal.set-texts", "sets.measure"));
  // A set in force names versions in force; a draft of a set may name a draft.
  const drafted = part((passport) => (passport.texts["measure-form"].versions = [draft(1)]));
  assert.deepEqual(readingOf(validate, drafted), refused("legal.set-texts", "sets.measure"));
  // A set in force names texts that apply by its own day.
  const later = part((passport) => (passport.texts["measure-notice"].versions[0].in_force_since = "2026-11-21"));
  assert.deepEqual(readingOf(validate, later), refused("legal.set-texts", "sets.measure"));
  const earlier = part((passport) => (passport.texts["measure-notice"].versions[0].in_force_since = "2026-11-19"));
  assert.ok(readingOf(validate, earlier).current);
  const both = part((passport) => {
    passport.texts["measure-form"].versions = [draft(1)];
    passport.sets.measure.versions = [setVersion(1, "draft")];
  });
  assert.deepEqual(readingOf(validate, both), { current: { texts: { "measure-notice": 1, "privacy-policy": 1 }, sets: {} }, next: none });
  // "constructor" is no text of the passport, whatever an object inherits.
  const inherited = part((passport) => (passport.sets.measure.versions[0].form.text = "constructor"));
  assert.deepEqual(readingOf(validate, inherited), refused("legal.set-texts", "sets.measure"));
});

test("legal.markdown: a text begins with a heading of the first level, and holds no HTML, image or link", () => {
  const text = (source, file = "texts/privacy-policy/2.md") => part((_, files) => (files[file] = source));
  for (const source of [
    "## Privacy policy\n\nWords.\n",
    "Privacy policy\n\n# Privacy policy\n",
    "",
    "Privacy policy\n==============\n\n<b>bold</b>\n",
    "# Privacy policy\n\nWe keep <b>the least</b> data.\n",
    "# Privacy policy\n\n<div>\nA block.\n</div>\n",
    "# Privacy policy\n\n![A diagram](diagram.png)\n",
    "# Privacy policy\n\n![A diagram][d]\n\n[d]: diagram.png\n",
    "# Privacy policy\n\nSee [the ICO](https://ico.org.uk).\n",
    "# Privacy policy\n\nSee [the ICO][ico], or [ico][].\n\n[ico]: https://ico.org.uk\n",
    "# Privacy policy\n\n[ico]: https://ico.org.uk\n",
    "# Privacy policy\n\nWrite to <privacy@example.org>.\n",
    "# Privacy policy\n\nSee <https://ico.org.uk>.\n",
    "# Privacy policy\n\nSee https://ico.org.uk or www.ico.org.uk.\n",
    "# Privacy policy\n\nWrite to privacy@example.org.\n",
    "# Privacy policy\n\n| A | B |\n|---|---|\n| [x](y) | z |\n",
  ]) {
    assert.deepEqual(readingOf(validate, text(source)), refused("legal.markdown", "texts/privacy-policy/2.md"), JSON.stringify(source));
  }
  // A setext heading of the first level is one; tables, lists, emphasis and code are Markdown.
  // A reference with no definition is text, in CommonMark.
  for (const source of ["Privacy policy\n==============\n\nWords.\n", "# Privacy policy\n\nSee [the ICO][ico].\n", "# Privacy policy\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- *one*\n- `two`\n\n> A quote.\n"]) {
    assert.ok(readingOf(validate, text(source, "texts/measure-form/1.md")).current, JSON.stringify(source));
  }
  // Each text with a problem is named, a draft's too.
  const two = part((_, files) => {
    files["texts/privacy-policy/1.md"] = "No heading.\n";
    files["texts/measure-form/1.md"] = "# Form\n\n<br>\n";
  });
  assert.deepEqual(readingOf(validate, two), refused("legal.markdown", "texts/measure-form/1.md", "texts/privacy-policy/1.md"));
});

test("legal.operator: the privacy policy is at app, applies, and has the section \"Who we are\" in every version", () => {
  // No policy, a policy elsewhere, a policy whose every version is a draft or still to come.
  const missing = part((passport, files) => {
    delete passport.texts["privacy-policy"];
    delete files["texts/privacy-policy/1.md"];
    delete files["texts/privacy-policy/2.md"];
  });
  assert.deepEqual(readingOf(validate, missing), refused("legal.operator", "texts.privacy-policy"));
  const elsewhere = part((passport) => (passport.texts["privacy-policy"].place = "form"));
  assert.deepEqual(readingOf(validate, elsewhere), refused("legal.operator", "texts.privacy-policy"));
  const drafts = part((passport) => (passport.texts["privacy-policy"].versions = [draft(1), draft(2)]));
  assert.deepEqual(readingOf(validate, drafts), refused("legal.operator", "texts.privacy-policy"));
  assert.deepEqual(readingOf(validate, part(), null, { today: "2026-11-19" }), refused("legal.operator", "texts.privacy-policy"));
  assert.ok(readingOf(validate, part(), null, { today: "2026-11-20" }).current);
  // Every version without the section is named by its file, a draft's too, and with the policy.
  const without = part((passport, files) => {
    passport.texts["privacy-policy"].versions = [draft(1), draft(2)];
    files["texts/privacy-policy/2.md"] = body("Privacy policy");
  });
  assert.deepEqual(readingOf(validate, without), refused("legal.operator", "texts.privacy-policy", "texts/privacy-policy/2.md"));
  // The heading is of the second level, and reads "Who we are" exactly, as plain text.
  for (const heading of ["# Who we are", "### Who we are", "## Who We Are", "## Who we are:", "## *Who* we are", "Who we are"]) {
    const source = `# Privacy policy\n\n${heading}\n\nALT EdTech LLC.\n`;
    assert.equal(hasWhoWeAre(source), false, heading);
    assert.deepEqual(readingOf(validate, part((_, files) => (files["texts/privacy-policy/1.md"] = source))), refused("legal.operator", "texts/privacy-policy/1.md"), heading);
  }
  for (const source of ["# Privacy policy\n\n## Who we are\n", "# Privacy policy\n\nWho we are\n----------\n", "# Privacy policy\n\n##   Who we are   ##\n", Buffer.from("\uFEFF# Privacy policy\n\n## Who we are\n", "utf8")]) {
    assert.equal(hasWhoWeAre(source), true, JSON.stringify(String(source)));
  }
  // A translation needs no such heading: the English text is the one in force.
  const translated = part((passport, files) => {
    passport.texts["privacy-policy"].versions[0].translations = ["ru"];
    files["texts/privacy-policy/1.ru.md"] = "# Политика конфиденциальности\n\n## Кто мы\n";
  });
  assert.ok(readingOf(validate, translated).current);
});

test("markdownProblem says why a text breaks legal.markdown", () => {
  assert.equal(markdownProblem("# Title\n\nWords.\n"), null);
  assert.equal(markdownProblem("## Title\n"), "it begins with no heading of the first level");
  assert.equal(markdownProblem("# Title\n\n![a](b.png) and [c](d)\n\n<i>e</i>\n"), "it holds image at line 3, link at line 3, html at line 5, html at line 5");
});

test("legal.in-force-unchanged: what the release before had in force is here as it was", () => {
  const before = part();
  assert.ok(readingOf(validate, part(), before).current);
  // A draft of the release before may change, come into force or go; so may the versions after.
  const drafted = part((passport, files) => {
    passport.texts["privacy-policy"].versions = [inForce(1)];
    delete files["texts/privacy-policy/2.md"];
  });
  assert.ok(readingOf(validate, drafted, before).current);
  const changedDraft = part((passport, files) => {
    passport.texts["privacy-policy"].versions[1] = inForce(2, "2026-12-01");
    files["texts/privacy-policy/2.md"] = `${policy()}\nThe second wording.\n`;
  });
  assert.ok(readingOf(validate, changedDraft, before).current);
  // A file as its bytes is the same as its text, and a byte order mark, which a decoder would
  // take out, is a change.
  const bytes = part((_, files) => (files["texts/privacy-policy/1.md"] = Buffer.from(files["texts/privacy-policy/1.md"], "utf8")));
  assert.ok(readingOf(validate, bytes, before).current);
  const marked = part((_, files) => (files["texts/privacy-policy/1.md"] = Buffer.from(`\uFEFF${files["texts/privacy-policy/1.md"]}`, "utf8")));
  assert.deepEqual(readingOf(validate, marked, before), refused("legal.in-force-unchanged", "texts/privacy-policy/1.md"));
  assert.equal(markdownProblem(Buffer.from("\uFEFF# Title\n", "utf8")), null);
  assert.equal(sameBytes(undefined, undefined), true);
  assert.equal(sameBytes("a", undefined), false);
  // A file in force, by a byte.
  const file = part((_, files) => (files["texts/privacy-policy/1.md"] = policy().replace("Texas.", "Texas!")));
  assert.deepEqual(readingOf(validate, file, before), refused("legal.in-force-unchanged", "texts/privacy-policy/1.md"));
  // An entry in force, its gist or its date; and the text's place, where the version is shown.
  const entry = part((passport) => (passport.texts["privacy-policy"].versions[0].summary = { en: "Another gist.", ru: "Суть." }));
  assert.deepEqual(readingOf(validate, entry, before), refused("legal.in-force-unchanged", "texts.privacy-policy"));
  const terms = (place) =>
    part((passport, files) => {
      passport.texts["terms-of-use"] = { place, versions: [inForce(1)] };
      files["texts/terms-of-use/1.md"] = body("Terms of use");
    });
  assert.deepEqual(readingOf(validate, terms("form"), terms("app")), refused("legal.in-force-unchanged", "texts.terms-of-use"));
  // Both: the entry and the file are named.
  const both = part((passport, files) => {
    passport.texts["measure-form"].versions[0].in_force_since = "2026-11-19";
    passport.texts["measure-notice"].versions[0].in_force_since = "2026-11-19";
    passport.sets.measure.versions[0].in_force_since = "2026-11-19";
    files["texts/measure-form/1.md"] = "# Another form\n";
  });
  assert.deepEqual(readingOf(validate, both, before), refused("legal.in-force-unchanged", "sets.measure", "texts.measure-form", "texts.measure-notice", "texts/measure-form/1.md"));
  // A text or a set with a version in force, gone, or the version gone: the ID is named, and its
  // file, gone with it, is not.
  const gone = part((passport, files) => {
    delete passport.texts["measure-notice"];
    delete files["texts/measure-notice/1.md"];
    passport.sets = {};
  });
  assert.deepEqual(readingOf(validate, gone, before), refused("legal.in-force-unchanged", "sets.measure", "texts.measure-notice"));
  // A release before whose passport has no texts or no sets, or entries of no shape, holds
  // nothing in force.
  for (const passport of [undefined, null, {}, { texts: [], sets: null }, { texts: { a: null, b: { versions: "no" } }, sets: { c: { versions: [null] } } }]) {
    assert.ok(readingOf(validate, part(), { passport, files: {} }).current, JSON.stringify(passport));
  }
});
