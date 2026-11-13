# Data protection impact assessment (DPIA)

> An assessment of the impact of the NovaTrail platform's data processing on the rights and freedoms of learners — children above all. It is required by GDPR Art. 35 and the ICO's code, standard 2, and the decision is R119. The steps and tables follow the ICO's template, "DPIA suggested process and template". Its steps 1–7 are sections 2–7, and the contents are those of Art. 35(7)(a)–(d). It is cited by section: `dpia 6`.
>
> This is an internal record of the platform, not a text shown to people, and it is in English, like the other documents of `docs/`: a Claude Code session reads them (R14, R143). The repository is public, so the DPIA is published, as the ICO advises: "it is good practice to publish your DPIA". It holds no security details that would help an attack. It is given as it is, with its date and version, to the ICO (Art. 36(3)(e)) and to an AI provider at a review of the measures (R123); the Russian text of the versions before 14 is in the git history, at the commit before T136. The platform has no lawyer: Claude writes the analysis, and the author accepts the measures and the residual risks (R112).
>
> The sources were read on 2026-11-09, and the laws of Connecticut, Colorado and Montana on 2026-11-13, section 9. The ICO's pages are read from Wayback Machine copies, because the site answers 403. They are marked "under review" after the Data (Use and Access) Act 2025.

## 1. Header

| Field | Value |
|---|---|
| Controller | the NovaTrail operator (privacy 2) |
| DPO | not appointed — why, section 7 |
| What it covers | the NovaTrail operator's deployment of the platform: `app`, `api`, `tutor`, the sign-in service, hosting and the AI providers, and also the samples from the samples page (privacy 4). It does not cover a self-hosted copy: the controller of that copy is its operator (the 2026-11-09 amendment to R115) |
| Version | 16, 2026-11-13 — T127: checked element by element against the assessments of Connecticut, Colorado and Montana — section 10; 15, 2026-11-13 — T144: stored works by methods of their own, the processing and the data the same; 14, 2026-11-12 — T136: translation into English, the content the same; 13, 2026-11-11 — T140: a new AI capability, correct answer words; 12, 2026-11-11 — T113: there will be no consultation of parents, the author's decision; 11, 2026-11-11 — T112: the texts for the family and version 2 of the policy with its translation, the mail on Gmail for families too — risk 18, the processor agreements against the New York law; 10, 2026-11-10 — T107: US state laws, the assessment for Connecticut, Colorado and Montana; the inbox triage before T107 — the heartbeat of the sign-in SDK; T111: the text sets of the samples page in force, withdrawal of eval-set samples and volunteers from the EU; T110: the operator's mail on Gmail, a recipient without a processor agreement, and the retention period of letters; the other measures and residual risks are those the author accepted in version 1 (section 7) |
| Rests on | privacy 1–7; R112–R128, R130–R134, R136–R141 |

**Review (R129).** The DPIA is reviewed by a task that changes what it rests on:
- a new kind of data or a new retention period;
- a new provider or processor;
- a new AI capability or AI route;
- opening an age category, a country or a function to children — voice, photo, own key;
- a signal from a family — a problem report or a letter to the operator saying that a measure does not work or a text is unclear (the 2026-11-11 amendment to R129).

Besides, the DPIA is reviewed before the beta, before the public launch and at least once a year. GDPR Art. 35(11) requires a review "at least when there is a change of the risk", and the ICO also at an external change: "if a new security flaw is identified, or a new public concern is raised". The yearly term is the platform's own rule: no source sets a term. The rule is also written in RUN.md, «Как устроен план».

**Keeping.** Every version of the DPIA stays in the history of `spec`'s git, an electronic form that any copy of the repository carries. The operator neither deletes the repository nor rewrites that history as long as the platform is offered and for three years after the processing it assesses ends. Connecticut, Colorado and Montana ask for the longer of those two periods, and Colorado asks to keep the earlier versions too (section 10.1, row 13; the 2026-11-13 amendment to R129). The PDF of each approved version, signed by the author, the operator keeps outside the repository for as long (R147).

**Review log:**

| Version | Date | What changed | Who |
|---|---|---|---|
| 1 | 2026-11-09 | the first assessment, from T93–T95 (RUN.md, T105) | Claude — the analysis; the author — signature 2026-11-09 |
| 2 | 2026-11-09 | the transfer mechanism of each agreement — section 3.5; representatives under Art. 27 and US state laws — conditions of section 8 (R131; RUN.md, T97). T97 does not change the kinds of data, retention periods, processors or AI routes | Claude — from the author's answers |
| 3 | 2026-11-09 | the scan of the consent form carries the name, the parent's signature and the date, without the child's name — a new field of an adult's data in the same bucket and for the same period; consent withdrawal deletes the profile; for a teenager who gives consent themselves, storage of works is turned on by the teenager themselves (R132; RUN.md, T98). T98 does not change the risks and measures: risk 12 — texts in plain words — got its texts, and the author approves them | Claude — from the author's answers |
| 4 | 2026-11-09 | an adult's measurement form — with name, signature and date — is kept 5 years after the samples, and withdrawal of measurement samples erases them within 30 days (the 2026-11-09 amendment to R124); the volunteer's form takes no consent to model training (the 2026-11-09 amendment to R126); the texts of the samples page name the IP address at GitHub and Hosting (R133; RUN.md, T99). Risk 10 — child samples — got the texts of its text set, and T99 does not change the measures and residual risks | Claude — from the author's answers |
| 5 | 2026-11-10 | the age of digital consent by country is part `consent-age/`: the EU, the EEA, the United Kingdom and the USA from primary sources, a country outside the table — 18, and when a country raised the age, a learner who consented themselves states their age again (R134; RUN.md, T100). The profile gains the age of digital consent of the country by which its category is given — a property of the law, from 13 to 18, not of the learner; T100 does not change retention periods, processors or AI routes; the measure for risk 11 exists, and the residual risk becomes low when `api` computes the category from the table (RUN.md, Д174) | Claude — from the author's answers |
| 6 | 2026-11-10 | the consent contract (R136; RUN.md, T103): the parent uploads the form's scan into `app` by the consent request code, and `api` puts it in the closed bucket of R116; a teenager's own consent and its withdrawal are in their profile; the age stated again — by one method. A new kind of data is the problem report: the tutor's words, a word from a closed set and the adult's text, on the server until the review and a year after, by the preservation period of §2258A(h)(1) (the 2026-11-10 amendment to R123); the record of consent to storage lives as long as the profile lives. T103 adds no processors or AI routes: the bucket and the database are the same | Claude — from the author's answers |
| 7 | 2026-11-10 | the texts for adults — `privacy-policy`, `terms-of-use` and `storage-consent` version 1 — are in force (R138; RUN.md, T110). Added: a kind of data — people's letters to the operator, kept a year after the letter or the last answer to it — and a recipient not under a processor agreement: the operator's mail is consumer Gmail, held by Google under its own terms (R138). The measure: the policy names it directly and asks people not to write a child's data in letters, and to do export, deletion and withdrawal in the app; before the first child the mail moves to a service with an agreement — the written assurances of COPPA §312.8(c) — by a new version of the policy (section 8). T110 does not change AI routes or ages; the other measures and residual risks are as before | Claude — from the author's answers |
| 8 | 2026-11-10 | the text sets of the samples page `measure` and `eval-set` version 1 are in force (R139; RUN.md, T111). What version 4 rested on changes in three places: anyone may take the published eval-set samples under Apache-2.0, for model training too, — while the platform trains no model of its own on them; withdrawal of an eval-set sample is erasure before it enters the repository, and removal from the next version of the module after that; the organizer takes no volunteers from the EU, the EEA and the United Kingdom. T111 does not change the kinds of data, processors or AI routes; the measures and residual risks are as before | Claude — from the author's answers |
| 9 | 2026-11-10 | the heartbeat of the SDK `@firebase/app` (`app` row В48): on the device — SDK versions by UTC day, up to 30 records, and they go with the requests to Firebase Auth, so the sign-in service learns the days on which `app` was opened. The kind of data is the same technical one, at the same processor that already gets the IP address, without learner data; the measures and residual risks are as before | Claude — from the author's answers |
| 10 | 2026-11-10 | US state laws (R140; privacy 3.4; RUN.md, T107). This DPIA also serves as the assessment of risks to minors under the laws of Connecticut (§42-529b), Colorado (§6-1-1309.5) and Montana: its sections 3–7 name the processing, its purposes, the risks to children and teenagers and the measures against them. The learner model is profiling, an assessment of skills from works, — and section 6, measure 7, assesses its impact: the choice of a task decides nothing about enrolment or access to education, and there are no automated decisions with legal effects (R03; the policy, "Your rights"). Whether this matches every element of the assessment that these laws require has not been checked against their full text — to be checked at the review after the consultation of parents (T113). T107 adds no new kinds of data, processors or AI routes; the measures and residual risks are as before, and the measurement takes no volunteers from Colorado and Washington | Claude — from the author's answers |
| 11 | 2026-11-11 | the texts for the family — `parent-consent`, `teen-consent`, `child-notice` and `teen-notice` version 1 — and version 2 of `privacy-policy` with a translation into Russian (R141; RUN.md, T112). What versions 7 and 10 rested on changes: the operator's mail stays Gmail for families too — new risk 18 and measure 18, accepted by the author; a teenager can withdraw the parent's consent, and storage that an adult turned on is asked of the teenager separately after confirmation; US consumer rights, with appeal, are in the policy; the processor agreements are checked against GBL §899-gg — none of them has a confirmation of erasure within 30 days (П-30). No kinds of data or processors were added: the heartbeat entered the policy, and it has been in the DPIA since version 9 | Claude — from the author's answers |
| 12 | 2026-11-11 | there will be no consultation of parents and children — the author's decision (the 2026-11-11 amendment to R129; RUN.md, T113): section 4 records why; the departure from std 2, Step 3, is new risk 19 and measure 19, accepted by the author; a signal from a family is a new ground for review (section 1); the consultation and the review after it leave the conditions of section 8, and the check against the elements of the assessment of Connecticut, Colorado and Montana, which version 10 put off until T113, moves to T127. This does not change the kinds of data, processors, retention periods or AI routes | Claude — from the author's answer |
| 13 | 2026-11-11 | a new AI capability — correct answer words, `correct_answer_words`: praise for the step and a question about which technique helped, by a call of its own to `tutor` with the work, the key and the task's solution, with its own eval set; open to all categories, like a hint (the 2026-11-11 amendment to R96; RUN.md, T140). Section 3.1 names these words. Section 6 is checked: the work goes to the same provider, by the same cells of the admission table and under the same agreements, and with it go the task's key, solution and techniques, data of the module and not of the learner (privacy 5.1), and the words fall under risk 4 and measure 4: the capability eval set of their own capability (R07), the safety prompt, the disclosure of AI and "report a problem", which names these words too (the 2026-11-10 amendment to R123). This does not change the kinds of data, processors, retention periods, AI routes, risks or measures | Claude — from the author's answer |
| 14 | 2026-11-12 | translation into English, like the other documents of `docs/` (R143; RUN.md, T136): the data, retention periods, processors, AI routes, risks and measures are the same, and the check of the translation against the original is held by `translation-check` and a blind reading of a sample | Claude — by the author's decision (R143) |
| 15 | 2026-11-13 | stored works (the 2026-11-13 amendment to R113; RUN.md, T144): the server keeps each work of a profile while storage is on — the handwriting on a task with a key too, as `storage-consent` version 1 already says, "each work of this profile" — as the device holds it, its writing history, the contexts of its submissions and its picture, up to 4 MiB, put, read back and erased one at a time by `WorkService`, and the export carries it. The processing carries out the consent already given, and the kinds of data, the period — until storage is off or a work is erased —, the processors and the AI routes are the same: the server reads no work and gives none to a provider. Claude's reading of section 3.2: the writing history is the dynamics R124 treats as biometrics in samples that go to others, whose purpose cannot be held; on the platform's own server it is held — nobody reads the history and it serves no identification —, so it is no special category there, but a child's personal information, kept only under the consent and out of any agent's reach (R114). Risk 13 covers it, and measure 13 stands | Claude — the review by R129 |
| 16 | 2026-11-13 | the check against the elements of the assessments of Connecticut (CGS §42-529b with §42-522), Colorado (C.R.S. 6-1-1309.5 with 6-1-1309 and 4 CCR 904-3, Part 8) and Montana (MCA 30-14-2819 with 30-14-2814), from their texts (section 9; RUN.md, T127), which version 10 put off: section 10 lists each element and where this DPIA answers it. What was missing is new here: the benefits weighed against the risks, with de-identified data, the families' expectations and the relationship (section 5.4); the benefits to others and the public (section 3.4); the impact assessment of the learner model as profiling (section 10.2); the risks by the kinds of harm that the laws define (section 10.3); keeping the DPIA (section 1). Colorado asks for the names, positions and signatures of whoever approves the DPIA, and for an evaluation of the profiling for fairness: R147 — the name in section 7, a signed PDF of each version, and a criterion of the learner simulator. This does not change the kinds of data, processors, retention periods, AI routes, risks or measures | Claude — the check against the laws' texts; the author — at the review of T127 |

## 2. The need for a DPIA

- **The ICO's code, std 2:** "Undertake a DPIA to assess and mitigate risks to the rights and freedoms of children who are likely to access your service, which arise from your data processing. Take into account differing ages, capacities and development needs and ensure that your DPIA builds in compliance with this code", and "if you offer an online service likely to be accessed by children, you must do a DPIA". The code applies also to a service from the USA that is open to children of the United Kingdom (R119).
- **GDPR Art. 35(1)** — an assessment where processing, "in particular using new technologies", "is likely to result in a high risk".
- **The ICO's list** ("When do we need to do a DPIA?"). Of its items, these apply to the platform:
  - "Targeting of children or other vulnerable individuals: … if you intend to offer online services directly to children";
  - "Innovative technology: … (including AI)";
  - "Biometrics: any processing of biometric data" — the writing history in measurement samples from adults (R124).
- **WP248 rev.01.** Of the nine criteria, three match: "Data concerning vulnerable data subjects" — "Vulnerable data subjects may include children", "Innovative use or applying new technological or organisational solutions" and "Sensitive data or data of a highly personal nature" — essays and what they will disclose (R127). And "a processing meeting two criteria would require a DPIA".
- **When.** Before the first child, wherever they live, and before the first learner from the EU or the United Kingdom, if that learner comes earlier (R119). The ICO: "You must complete your DPIA before the service is launched, and ensure the outcomes can influence your design".

## 3. Describe the processing

### 3.1. Nature

- **Collection.**
  - The account owner signs in through the Google window (R16 infra) and creates the learners' profiles themselves. A child does not create an account (R26).
  - What is collected about a child: a pseudonym, an avatar from a set, the age category, the country, the interface language and the presentation style (privacy 4).
  - The learner's work stays on the device. What goes for checking is a crop or a picture of the work (architecture 4.1). While the storage of a profile's works is on, the server keeps each work as the device holds it, a stored work, and reads none (R113).
  - Child consent — by a signed form, which the operator checks (R116).
- **Use.**
  - The AI reads the work, and a program gives the verdict (R03).
  - The tutor chooses the words of a hint (R05), and after a correct answer, praise for the step and a question about which technique helped (concepts 10).
  - The learner model and the engine choose the next task, with a reason code for the adult (concepts 11 and 12; R80).
  - The adult sees the profile's progress (product 3).
- **Storage** — the database of `api`, the device, the sign-in service and the logs, for the periods of the retention policy (R128; privacy 9, П-9).
- **Disclosure** — only to processors under an agreement (section 3.5). The data are not sold or passed to anyone else (privacy 7).
- **Deletion and export** — in one step, by the account owner (architecture 4.5).

### 3.2. Scope

- **Kinds of data** — privacy 4. Special categories (Art. 9):
  - what an essay will disclose about the learner's health (R127);
  - the writing history in measurement samples from adults — it is treated as biometrics (R124). The writing history of a stored work is not, by Claude's reading of version 15 (section 1): on the platform's server nobody reads it and it serves no identification.
- **What there is not:** a date of birth, the child's name, geolocation, children's voice (О-6), photos from paper in the first slice ("Task from my paper", «Задача с моей бумаги», comes later, product 4), communication between users, and advertising (privacy 7).
- **How much.** Until the beta — the families of the closed beta. The scale grows with the public launch, and then the DPIA is reviewed (section 1).
- **Retention periods** — the retention policy by privacy 9, П-9, and R113, R117, R125, R126 and R128. The texts of T97 and T98 write the policy.
- **Geography.** Learners from any country. The data lie in the USA, in `us-east4` and `aws-us-east-1` (R109).

### 3.3. Context

- **Age.** The platform is for any age, and the service is open to children directly (R01; R06). The four age categories — privacy 3.1. What depends on the category — privacy 3.2: the AI route, the provider, voice and photo, modules.
- **Age and consent** — by the method of R116: a parent's signed form, and by the public launch a card transaction as well. A teenager above the age of digital consent gives consent themselves, and the owner declares being an adult (R118).
- **Parental controls.** A child learns under an adult's account. The section for adults is locked by a PIN. The adult sees progress — attempts, rubric marks, repeating traps — and the reason codes of the engine's choice (product 3; concepts 12). There is no real-time monitoring of the child and no tracking of their location.
- **Public concerns** — AI near children: what the model will say to a child, what the provider will do with their work, emotion inference. They are examined in R121–R123 and in section 6.
- **The family's expectations** are set by the promises in plain words (privacy 7) and by the texts of T97 and T98.

### 3.4. Purposes and benefits

- **Purpose** — adaptive learning: to check a learner's work, to hint a step, to choose the next task by the learner model (product 1).
- **Benefit for the child.** Checking on paper and on the canvas without a "red pen": "Not yet" instead of "incorrect", and for children — without timers and competitions, without advertising and dark patterns (product 7, principle 9).
- **Commercial interest.** The family's subscription (О-14). Data are not sold, and there is no advertising.
- **Benefit for the family.** The adult sees the profile's progress and the reason for each choice of a task, and does not have to check the work themselves (product 3; concepts 12).
- **Benefit for others and the public.** The platform, its formats and the official modules' content are open under Apache-2.0 (R12, R20): anyone may run a copy of their own (R115), and the module format is open to any author (R02, R42). The published eval-set samples, from adults who agreed to it, let anyone check how a model reads handwriting (R139).

### 3.5. Processors and region

| Processor | What | Agreement |
|---|---|---|
| Google Cloud — Cloud Run, logs, Secret Manager, the operator's bucket | the platform's services, logs without direct identifiers, samples and form scans | Cloud Data Processing Addendum: "Google is a processor" (R109, R125) |
| Firebase Auth | the account owner's sign-in; the SDK heartbeat — SDK versions by day (`app` row В48) | the Google Cloud terms and the Cloud DPA (privacy 2) |
| Firebase Hosting | serving the build of `app` | Firebase Data Processing and Security Terms: "Google is a processor" (R128) |
| Neon, part of Databricks, on AWS | the database of `api` | the Databricks DPA with its Neon appendix (privacy 2) |
| OpenAI and Anthropic | reading the work, and the tutor's words | the DPA in their terms, zero data retention upon approval (R121) |

The operator's mail is consumer Gmail, for families too: Google keeps the letters under its own terms, not as a processor, and it is not in this table (R138 and its 2026-11-11 amendment; risk 18). Google's models are closed (R47). Own key is only for a profile of category `adult`, and it is closed to a learner under 18 (R122). The learning data of learners from the EU and the United Kingdom go to the USA (R109). Transfer to the USA is under agreements: at Google — the EU-U.S. Data Privacy Framework and its UK Extension, with the SCC module 2 with the UK Addendum as the fallback; at Neon — the SCC with the UK Addendum in the Databricks DPA, and Databricks, with Neon, is on the Data Privacy Framework list; at OpenAI and Anthropic — the SCC with the UK Addendum, and they are not in the Data Privacy Framework (R131; privacy 10).

## 4. Consultation process

- **Parents and children** (Art. 35(9); std 2, Step 3: "seek and document the views of children and parents") — are not asked: the author's decision of 2026-11-11, an amendment to R129. Art. 35(9) asks for their views "where appropriate", and the author judged that they are not needed here; in this the DPIA departs from std 2 — risk 19, which the author accepted (sections 6 and 7). A problem report (R123, R136) or a letter to the operator (R138) in which a family says that a measure does not work or a text is unclear is a ground for review (section 1). It does not replace asking: these channels are about the tutor's words and about requests, and whether a child understands what they are told cannot be seen in them.
- **Experts on children's rights and development** (std 2, Step 3) — before the public launch. The first families are a closed beta, and advice is needed more when the service is open to all.
- **AI providers.** Their measures for minors and the right to check them are in R123. The list of measures with their status is what the platform will show them.
- **DPO** — none (section 7).

## 5. Necessity and proportionality

### 5.1. Lawful basis and principles

- **Lawful basis.** An adult's own data — contract, Art. 6(1)(b). The data of a learner under 18 — consent, Art. 6(1)(a): below the age of digital consent, the parent's, under Art. 8, and under 13, also verifiable under COPPA (R116).
- **Data minimisation:**
  - a pseudonym, not a name;
  - a category, not a date of birth (privacy 3.3);
  - a crop of the work on the device, not the whole sheet (architecture 4.1);
  - the server does not store the text of an essay (R87);
  - stored works on the server — only by choice, and storage is off by default (R113).
- **Accuracy and bias:**
  - the verdict is given by a program, not by AI (R03);
  - an observation is joined from two readers (R86);
  - in doubt — a request to rewrite, not an "error" (R04);
  - a model is admitted only after eval (R07; R96).
- **Explaining AI.** The learner is told that they are talking with AI, not with a person (R123). The learner sees what was read (product 7, principle 8).
- **Retention periods** — the retention policy (section 3.2).
- **Rights** — export and deletion in one step (architecture 4.5). What remains after deletion is a minimal record of consent, for 5 years (R117).
- **Processors** — under agreements (section 3.5).

### 5.2. Proportionality of consent and age verification

The ICO: "A data protection impact assessment should help you to decide what steps you need to take to verify age and parental responsibility" (R119).
- **A parent's signed form** (R116). A child's work goes to an AI provider, and an essay may disclose something personal. So the method is stronger than "email plus". But it requires no document of the child and no data of a verification service. By the public launch a card transaction is added: the more families there are, the less the operator can know them itself.
- **An adult — by declaration** (R118; П-6). Sign-in through the Google window says nothing about age, and checking an adult's document is more data than the risk justifies. The cost of an error is a child with an adult's rights; against it stand the measures against risk 5 (section 6).
- **The learner's age** is named by the owner, and the platform stores only the category (privacy 3.3). There is no separate check of the child's age: the parent who signed the form answers for it.

### 5.3. Conformance with the ICO's code

Std 2 requires explaining "how you conform to each of the standards set out in this code". By standard:

| Standard | What the platform does |
|---|---|
| 1. Best interests of the child | no timers, competitions, advertising or dark patterns (product 7, principle 9); the verdict is a program's, not the AI's (R03) |
| 2. Data protection impact assessments | this DPIA (R119, R129) |
| 3. Age appropriate application | four age categories, and the AI routes, providers, voice, photo and modules depend on the category (privacy 3) |
| 4. Transparency | the gist of consent — briefly and in the language of the screen (R116); the texts for the family and for the child — T98; the samples page says what lies in the file and who will see it (R11 canvas) |
| 5. Detrimental use of data | neither data for holding attention nor emotion inference (R123); the platform does not look for signs of harm in an essay, and shows the child where to turn (R127) |
| 6. Policies and community standards | the platform does what privacy 7 promises, and the texts of T97 and T98 name it; the modules of the first slice are official only (О-9) |
| 7. Default settings | by default — the most private: the storage of works is off (R113), voice is closed to children (О-6), there is no own key under 18 (R122) |
| 8. Data minimisation | section 5.1. "Separate choices over which elements they wish to activate": the adult connects modules, and turns on voicing and the storage of works separately, and voice is closed to children (privacy 4; R113; О-6) |
| 9. Data sharing | only to processors under an agreement (section 3.5); at a threat to a child — the operator's escalation path (R123, R127) |
| 10. Geolocation | there is no geolocation. The owner states the country, and the clock offset of the device is not geolocation (R118) |
| 11. Parental controls | the adult sees progress, and does not watch in real time. Std 11 requires telling the child about the controls in a form they understand: the texts for the child of T98 and a screen of `app` say that the adult sees their progress (section 6, risk 16) |
| 12. Profiling | std 12 requires keeping profiling off, "unless you can demonstrate a compelling reason for profiling to be on by default". The argument: the learner model and the choice of tasks are the learning itself, for which the child came, and without them there is no service (product 1). The protection from harm that std 12 requires: tasks only from official modules (О-9), without timers and competitions (product 7, principle 9). There is no profiling for advertising or for others' purposes; the adult sees the reason codes (concepts 11 and 12; R80) |
| 13. Nudge techniques | no nudging to give more data or to weaken privacy; ranks are numbers, without names, and do not affect the model (О-13; concepts 11) |
| 14. Connected toys and devices | does not apply: the platform is a web application |
| 15. Online tools | export, deletion, consent withdrawal — in the section for adults, in one step (architecture 4.5; R116), and for a learner who gives consent themselves, their consent and the storage of their works are in their profile (R132); "report a problem" — at every answer of the tutor, for the adult (R123); for the child — the "Help" section («Помощь»): whom to turn to (R127). Std 15 speaks of tools "to help children exercise their data protection rights and report concerns", and the learner cannot report a problem themselves — П-26 |

### 5.4. Benefits against risks

Connecticut, Colorado and Montana ask to weigh the benefits of the processing, to the operator, the learner, others and the public (section 3.4), against the risks to the learner as the measures leave them (section 6), and to take into account de-identified data, the learners' reasonable expectations, the context and the relationship (section 10.1, rows 5 and 6). Claude's weighing; the author accepts it (R112; section 7):
- **The benefits are the service itself.** The processing serves only learning: the check of a work, a hint, the choice of the next task (section 3.4). Without the learner model and the AI's reading of a work there is no adaptive learning, which is what the family came for (section 5.3, std 12).
- **The risks after the measures.** None is high. Medium: risks 2, 3, 5, 11, 12 and 17–19, and risk 4 under 13 (sections 6.2 and 7). The medium risks come from what a child writes or tells (2, 3), from what a model says (4), and from the limits of consent and of the texts (5, 11, 12, 17–19). None comes from a use of the data beyond learning: the data are not sold, not used for advertising or for others' purposes, and the AI providers do not keep or train on a child's work (measure 1).
- **De-identified data.** The platform keeps none in the laws' sense: such data cannot "reasonably be used to infer information about … an identified or identifiable individual" (CGS §42-515(16)), while every record of `api` belongs to a profile, so that the owner can export and delete it (architecture 4.5). Instead, the data identify nobody directly: a pseudonym and not a name, a category and not a date of birth, logs without direct identifiers, and a crop of the work and not the whole sheet (section 5.1).
- **Expectations, context and relationship.** The adult of the account chose the platform for the learner, gave the consent, and sees the progress. The child learns in the adult's account, and the texts for the family and for the child say what is kept and who sees it (section 3.3; R141). What the platform does not do follows the promises in plain words (privacy 7): the data go only to processors, but for a letter a family writes to the operator's Gmail (risk 18) and a report to the authorities at a threat to a child (measure 3), and nothing a child does is public.
- **The outcome.** The benefits outweigh the residual risks: they serve the learner, and every risk has a measure. A medium residual risk either is to fall by a term — the conditions of section 8 and the open questions named in table 6.2 — or the author accepted it as it is: risks 2, 3 and 19 (section 7).

## 6. Risks and measures

**The scale is the ICO template's.**
- Likelihood of harm — "Remote, possible or probable": remote, possible, probable.
- Severity of harm — "Minimal, significant or severe": minimal, significant, severe.
- Overall risk — "Low, medium or high": low, medium, high.
- The ICO: "any significant possibility of very serious harm may still be enough to qualify as a high risk", and severity is assessed "precautionary".
- Where a risk differs by age, the assessment is given by the categories of privacy 3.1.

**The risks of std 2, Step 5, that the platform does not have by its design:**
- there is no communication between users, so there is no "online grooming" or "bullying or peer pressure" inside the service either (privacy 7);
- there is no advertising, no purchases inside a lesson and no tariffs for the child: there is no "economic exploitation" (О-14 — the owner's subscription);
- there are no timers, competitions, streaks or notifications: "compulsive use", "excessive screen time" and sleep are not affected (product 7, principle 9). The child takes the next task themselves;
- there is no emotion inference and there are no decisions "without human review" about the child (R123).

The other risks of std 2 — "access to harmful or inappropriate content", "misinformation", "undermining parental authority", "loss of autonomy or rights", "physical harm" — and the data risks stand in the table below.

### 6.1. Risks

| No. | Source of risk and nature of harm | Likelihood of harm | Severity of harm | Overall risk |
|---|---|---|---|---|
| 1 | a child's work is kept at an AI provider or goes into model training | possible | significant | medium |
| 2 | a child writes their own name or other people's names on the sheet, and they go to the provider (R127) | probable | significant | medium |
| 3 | a child discloses in an essay harm to themselves or from others, and nobody sees it (R127) | possible | severe | high |
| 4 | the tutor says something unsuitable, wrong or harmful to a child — "access to harmful or inappropriate content", "misinformation" | possible | significant; under 13 — severe | medium; under 13 — high |
| 5 | consent is forged, or a child creates an account by declaring themselves an adult — "undermining parental authority" | possible | significant | medium |
| 6 | an account takeover or a breach at a processor exposes a child's data | remote | significant | low |
| 7 | the learner model and the engine put a label on a child or narrow their choice — "undue restriction on information" | possible | minimal | low |
| 8 | data live longer than needed — against §312.10 COPPA and Art. 5(1)(e) | possible | significant | medium |
| 9 | the IP addresses of devices — in the Hosting logs for "a few months" and in the audit for 400 days (R128) | probable | minimal | low |
| 10 | a child sample with the child's handwriting or name goes to the wrong place or lives longer than its period (R125) | remote | significant | low |
| 11 | a child from a country with another age of digital consent lands in the wrong category (privacy 3.1; T100) | possible | significant | medium |
| 12 | the family does not understand the texts in English and agrees to something other than what it thinks (R116) | possible | significant | medium |
| 13 | a stored work leaks: an essay with the child's health data, or a work's writing history (R113, R127) | remote | severe | medium |
| 14 | a child with own key becomes the provider's "Customer" (R122) | remote | significant | low |
| 15 | a child's voice and photo — biometrics and excess data (О-6; privacy 6) | remote | significant | low |
| 16 | a child does not know that the adult sees their progress — "loss of autonomy", std 11 | probable | minimal | low |
| 17 | a teenager cannot report a problem with the tutor themselves, and does not want to tell the adult of the account — std 15 | possible | significant | medium |
| 18 | a parent writes about a child to the operator's mail, and Gmail keeps the letter not as a processor — without the written assurances of COPPA §312.8(c) and without an agreement under GBL §899-gg (R138 and its 2026-11-11 amendment) | possible | significant | medium |
| 19 | the measures are not checked against the views of parents and children, and a child does not understand what they are told about their data and about the tutor — std 2, Step 3 (the 2026-11-11 amendment to R129) | possible | significant | medium |

### 6.2. Measures

| No. | Options to reduce or eliminate risk | Effect on risk | Residual risk | Measure approved |
|---|---|---|---|---|
| 1 | platform AI is closed to a child until the provider has an approved zero data retention (R121; the admission table); only the routes that it covers, without Anthropic's Covered Models; under the processor agreements the providers do not train models on the content (R121) | reduced | low | section 7 |
| 2 | the crop on the device (architecture 4.1); the platform's reminder before each submission of work that goes to the AI whole (R127; Д154); topics under 18 are made-up and general (R127); the text of an essay is not stored (R87) | reduced | medium: the reminder does not stop a child from writing a name | section 7 |
| 3 | for a child under 18, at a work with a rubric and in the "Help" section («Помощь»), where to turn is always shown: to an adult and to helplines (R127; Д154); "report a problem" for the adult — the method `ReportProblem`, with the tutor's words that the adult saw, — and the operator's escalation path, with §2258A (R123; R136; Д155); the platform does not look for signs of harm — that would be an inference about health (Art. 9) | reduced | medium: nobody will read a disclosure anyway, and showing where to turn is the minimum that Samaritans name | section 7 |
| 4 | the verdict is a program's (R03), the words go by the capability eval set (R07), a system safety prompt for minors after Anthropic's article (R123; Д150), the disclosure of AI, "report a problem" (R123); the tutor's words — a short question, without the answer (R05) | reduced | low; under 13 — medium | section 7 |
| 5 | a signed form with a consent request code, whose scan `app` uploads into the closed bucket and the operator matches against the code, and by the public launch a card transaction too (R116; R136; П-28); the adult's declaration (R118); the section for adults — behind a PIN | reduced | medium | section 7 |
| 6 | neither the child's name nor their date of birth; sign-in only through the Google window (R16 infra); processors under agreements with security measures (section 3.5); logs without direct identifiers (privacy 4) | accepted | low | section 7 |
| 7 | the model serves only to choose tasks; ranks do not affect the model (concepts 11); the learner chooses a skill on the map themselves (concepts 11); the adult sees the reason codes. This is also the assessment of profiling under the laws of Connecticut, Colorado and Montana (R140; section 10.2): the choice of a task decides nothing about enrolment or access to education, and there are no automated decisions with legal effects (R03; the policy, "Your rights") | accepted | low | section 7 |
| 8 | a written retention policy (R128) — with the periods of the problem report and of the record of consent to storage (R136) —, deletion by code: the jobs of `api` (privacy 9, П-9) and the lifecycle rule of the bucket (R125) | reduced | low | section 7 |
| 9 | only "support for the internal operations" under COPPA; the link of Hosting with Cloud Logging is off; the periods are in the policy and in the notice (R128) | accepted | low | section 7 |
| 10 | a separate parent's form, a closed bucket with access for one organizer, without agents, 2 years and erasure within 30 days on withdrawal, the name is searched for by hand before the runner, to AI — only by the admission table (R124, R125; Д156) | reduced | low | section 7 |
| 11 | the table of the age of digital consent by country — [part `consent-age/`](../consent-age/README.md), from primary sources, with the day from which an age applies; a country outside the table — 18, the parent's consent until 18; when a country raised the age, a learner who consented themselves states their age again — `RestateAge`, and until then a learning request gets `CAUSE_AGE_NEEDED` (R134; R136; privacy 3.1 and 3.3) | reduced | medium until `api` computes the category from the table (RUN.md, Д174), then low | section 7 |
| 12 | the gist of consent in the language of the screen (R116); texts in plain words — T97 and T98; the translation of the policy into Russian — R141 | reduced | medium until T98, then low | section 7 |
| 13 | storage is off by default; the switch speaks of the personal in an essay, and turning it on is explicit consent (R113, R127); turning it off erases the copies | reduced | low | section 7 |
| 14 | own key — only for a profile of category `adult`, and it is closed to a learner under 18 at all providers (R122) | eliminated | low | section 7 |
| 15 | voice input is closed to children until a decision on П-5 (О-6); a photo from paper is cropped on the device to the task (privacy 6) | reduced | low | section 7 |
| 16 | the texts for the child (T98) and a screen of `app` say that the adult sees their progress (Д157) | reduced | low | section 7 |
| 17 | the "Help" section («Помощь») and helplines (R127); whether to give "report a problem" to the learner themselves is П-26, before the beta: the method is a learning request, so the answer is a button in `app` (R136) | reduced | medium until П-26 | section 7 |
| 18 | the policy and the texts for the family ask people not to write a child's data in letters; export, deletion, withdrawal, settings and age are in the app; a request comes from the sign-in address, naming nothing about the child, and by it the operator finds the account; letters live a year (R138, R141); a request in the app — П-32, by the public launch | reduced | medium until П-32 | the author, 2026-11-11 |
| 19 | the texts for the child in plain words, by age (R132; T112), and a screen of `app` that says the adult sees their successes (Д157); a signal from a family is a ground for review (section 1); the advice of experts on children's rights and development before the public launch (section 4) | reduced | medium | the author, 2026-11-11 |

## 7. Sign off and outcomes

- **Residual high risk — none.** Before the measures, risk 3 is high — for all categories — and so is risk 4 — under 13; after the measures both are medium. Consulting the ICO under Art. 36(1) is not needed: "If you identify a high risk that you are not mitigating, you must consult the ICO before you can go ahead".
- **Measures and residual risks approved by:** the author, on 2026-11-09, at T105 — all the measures of table 6.2 and all the residual risks, the medium ones among them being risks 2, 3, 5, 11, 12 and 17 and risk 4 under 13; and on 2026-11-11, at T112, — risk 18, medium: the mail on Gmail for families too, without a processor agreement (the 2026-11-11 amendment to R138). There will be no consultation of parents (section 4); risk 19, medium, the author accepted on 2026-11-11, at T113.
- **DPO not appointed.** The ICO, "Data protection officers": "Under the UK GDPR, you must appoint a DPO if: … your core activities require large scale, regular and systematic monitoring of individuals … or your core activities consist of large scale processing of special categories of data". This is the ICO's paraphrase; the text of Art. 37 of the UK GDPR and the GDPR has not been checked (section 9). Until the beta the platform has no large scale, and of the special categories it has only what an essay will disclose about health, and the writing history of adult volunteers. The ICO advises: "If you decide that you don't need to appoint a DPO … it's a good idea to record this decision". The decision is reviewed before the public launch.
- **No consultation of parents and children** — the author's decision of 2026-11-11 (an amendment to R129; section 4). The author also accepts the departure from std 2, Step 3 — risk 19: the measures of this assessment are not checked against the views of those they protect, and nobody checks whether a child understands what they are told.
- **Who approves.** "The author" in this DPIA is Aleksandr Riazanov, Staff Software Engineer, whose company ALT EdTech LLC is the operator (R137). A version is approved when the author signs its PDF, with the version and the date, and the operator keeps it outside the repository (section 1, "Keeping"); the `Signed-off-by` of a commit is no approval (R147).
- **Version 16** — the weighing of section 5.4 and the assessments of section 10 — is Claude's analysis, which the author accepts at the review of T127 (RUN.md) and signs as R147 says.
- **This DPIA will be kept under review by:** the author, by the rule of section 1.

## 8. Conditions before the first child

The first child comes when all of this is done:
- zero data retention is approved at OpenAI and Anthropic (R121) — the author's step;
- the texts for adults, for the family and for the child — T97 and T98, with the retention policy; in force — T110 and T112 (R138, R141), and with them version 2 of the policy, with US consumer rights and a translation into Russian;
- the table of the age of digital consent by country — T100, done: part `consent-age/` (R134), and `api` computes the category from it (RUN.md, Д174);
- for a child from the USA — the analysis of state laws, T107, done: R140 and privacy 3.4; version 2 of the policy — T112 (R141); what remains — the procedure for a breach (Д200), the screens of `app` (Д201, Д204), the procedure for answering requests (Д206) and the addenda to the processor agreements (П-30);
- the operator's mail is no longer a condition: it stays Gmail for families too, and the author accepted risk 18 on 2026-11-11 (an amendment to R138);
- `api` and `app` have taken version 2 of the part `legal/`, the translation and a teenager's withdrawal of the parent's consent — with a tag of the 0.15 line (RUN.md, Д203 and Д204);
- the check of this DPIA against the elements of the assessment of Connecticut (§42-529b), Colorado (§6-1-1309.5) and Montana — T127, done: section 10 (version 16 in the log); what remains — the author's signature on the PDF of version 16, the author's step, and the criterion of fairness of the learner simulator with its result in section 10.2, a task of `sim` (R147; COORDINATION.md, row 4.16);
- the consent contract `app` ↔ `api` — T103, done: R136, and `api` and `app` take it with a tag of the release of E4 (RUN.md, Д182 and Д183);
- the components have taken the answers of `spec` — with the tags `v0.12.0` and `v0.13.0` and the release at the end of E4 (T102) — RUN.md, Д148, Д150, Д154, Д155 and Д157;
- for child samples, also the operator's bucket (Д156) and the text set of the child sample in force — T117.

The first learner from the EU or the United Kingdom — an adult too — comes after the author's signature (section 7; R119). The signature exists since 2026-11-09, so that learner waits only for the conditions that concern them as well: the texts of T97, the table of T100 and the answers of `spec` at the components, — and for the operator's representatives in the EU and in the United Kingdom under Art. 27 GDPR and UK GDPR: until they exist, `api` does not accept learners from there (R131).

## 9. Sources

Read on 2026-11-09.

- GDPR — Art. 35, 36 and 37, recitals 84 and 90, — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679); the text of the UK GDPR on legislation.gov.uk has not been checked, and whether the Data (Use and Access) Act 2025 changes Art. 35–37 has not been verified.
- The ICO, from Wayback Machine copies:
  - Age Appropriate Design Code, [std 2 "Data protection impact assessments"](https://web.archive.org/web/20261030042209/https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/) — the copy of 2026-10-30;
  - ["When do we need to do a DPIA?"](https://web.archive.org/web/20261012165422/https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/) — 2026-10-12; ["How do we do a DPIA?"](https://web.archive.org/web/20261017145525/https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/) — 2026-10-17;
  - ["DPIA suggested process and template"](https://web.archive.org/web/20260828174458/https://ico.org.uk/media2/migrated/2553993/dpia-template.docx), the file of 2018-12-13 — 2026-08-28;
  - ["Data protection officers"](https://web.archive.org/web/20261028012547/https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-officers/) — 2026-10-28;
  - the picture of the risk matrix and annex D of the code have not been read.
- WP29, [Guidelines on DPIA, WP248 rev.01](https://ec.europa.eu/newsroom/article29/items/611236), 4 October 2017.
- The ICO, Age Appropriate Design Code, ["Code standards"](https://web.archive.org/web/20260926020439/https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/) — the wording of all 15 standards, from a Wayback Machine copy of 2026-09-26; the pages of standards 1–4, 7, 10 and 11 were read at T93, and those of 5, 9 and 12 at T95 (privacy 10).
- What the measures quote from other sources lies with the decisions they cite and in privacy 10. Named directly here: Samaritans, [Supporting user wellbeing](https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/guidelines-tech-industry/supporting-user-wellbeing/), the page has no date (R127); 18 U.S.C. [§2258A](https://www.law.cornell.edu/uscode/text/18/2258A) (R127); 16 CFR 312.10 — through the eCFR API as of 2026-11-05 (R125, R128).

Read on 2026-11-13 (RUN.md, T127), from the states' own sites; the quotes are in section 10:
- Connecticut — CGS ch. 743jj, [2026 Supplement](https://www.cga.ct.gov/2026/sup/chap_743jj.htm): §42-515, §42-522, §42-529 and §42-529b in the versions "effective July 1, 2026", after PA 25-113 §§5, 11, 14 and 16. The site sends no intermediate certificate; it was read as in sources 3.11.
- Colorado — C.R.S. 6-1-1309.5 and the definitions 6-1-1303(14.5) and (16.5), from the signed text of [SB 24-041](https://leg.colorado.gov/bill_files/46008/download), which applies from 2025-10-01; 6-1-1309, from the enrolled text of [SB 21-190](https://leg.colorado.gov/sites/default/files/documents/2021A/bills/2021a_190_enr.pdf): whether a later act amended it was not checked, since the Code's own PDF of title 6 did not yield its text, but the rules in force from 2025-12-01 cite its subsections (2)(a), (3) and (5) for the same content, and Rule 8.04 asks for all of it besides; the Colorado Privacy Act Rules, [4 CCR 904-3](https://www.sos.state.co.us/CCR/GenerateRulePdf.do?ruleVersionId=12259&fileName=4+CCR+904-3), rules 8.01–8.06 and 9.06, from the Secretary of State's PDF, whose history ends "Rules 2.02, 6.13, 6.14, 7.03 B.3 eff. 12/01/2025".
- Montana — MCA, the 2025 edition, at [mca.legmt.gov](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/sections_index.html): [30-14-2819](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0190/0300-0140-0280-0190.html), from SB 297, ch. 567 of 2025; [30-14-2814](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0140/0300-0140-0280-0140.html); [30-14-2803](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0030/0300-0140-0280-0030.html), the applicability; [30-14-2802](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0020/0300-0140-0280-0020.html), the definitions. The site warns that "the printed version will prevail".

## 10. The assessments of Connecticut, Colorado and Montana

This DPIA is also the assessment that these three states require of a controller that knows a user is a minor, under 18. In Connecticut it is a data protection assessment, and with profiling also an impact assessment; in Colorado and Montana, a data protection assessment at a heightened risk of harm to minors (R140; privacy 3.4). The platform knows the learner's age category but not their state, so it holds to these laws for every learner from the USA (R140). Each law takes an assessment made for another law "if … reasonably similar in scope and effect" (CGS §42-529b(e); C.R.S. 6-1-1309.5(4); MCA 30-14-2819(4)). This DPIA does not rest on that clause: it answers each element itself. The texts were read on 2026-11-13 (section 9); the reading is Claude's, and the author accepts it (R112; section 7).

**Who must, and from when.**
- **Connecticut.** CGS §42-529b binds "each controller that offers any online service, product or feature to consumers whom such controller has actual knowledge, or wilfully disregards, are minors". From 2026-07-01, a service that "engages in any profiling based on such consumers' personal data" also needs an impact assessment, §42-529b(b).
- **Colorado.** C.R.S. 6-1-1309.5(1) binds a controller that "on or after October 1, 2025" offers such a service, "if there is a heightened risk of harm to minors". The rules give the minimum content: Rule 8.02(A) covers a risk "to a Consumer or to a Minor", and Rule 8.04 lists the content. The profiling elements of Rule 9.06(F) apply to profiling under 6-1-1309(2)(a), one that "presents a reasonably foreseeable risk of" unfair treatment, injury, intrusion or "other substantial injury". Risk 7 is such a risk, however low, so section 10.2 answers them too.
- **Montana.** MCA 30-14-2819(1) binds a controller from 2025-10-01, in the same words as Colorado. Under 30-14-2803(2) it applies with no threshold to "persons that conduct business in this state or deliver commercial products or services that are intentionally targeted to residents of this state". Whether a Texas operator that serves the whole country, by invitation and for free, does either is not verified, and it is taken to apply (privacy 3.4).

### 10.1. The data protection assessment

| No. | Element | Connecticut | Colorado | Montana | In this DPIA |
|---|---|---|---|---|---|
| 1 | the purpose of the service, and a summary of the processing | §42-529b(a)(2)(A): "the purpose of such online service, product or feature" | 6-1-1309.5(1)(b)(I); Rule 8.04(A)(1): "A short summary of the Processing activity" | 30-14-2819(1)(b)(i) | 3.4; the summary — 3.1 |
| 2 | the categories of a minor's data | (B): "the categories of minors' personal data that such online service, product or feature processes" | (II); Rule 8.04(A)(2), and (4)(e) — "Specific types of Personal Data" | (ii) | 3.2 and privacy 4, field by field |
| 3 | the purposes for which a minor's data are processed | (C) | (III) | (iii) | 3.1, "Use", and 3.4 |
| 4 | a heightened risk of harm to minors that is "a reasonably foreseeable result of offering such online service, product or feature to minors" | (D); its kinds — §42-529(5) | (IV); its kinds — 6-1-1303(14.5); Rule 8.04(A)(6), "the sources and nature of risks", with the examples a–k | (iv); its kinds — 30-14-2802(13) | 6.1; by the laws' kinds of harm — 10.3 |
| 5 | the benefits weighed against the risks as the safeguards leave them | §42-529b(a)(1), consistent with §42-522, and §42-522(b)(2): "identify and weigh the benefits that may flow, directly and indirectly, from the processing to the controller, the consumer, other stakeholders and the public against the potential risks to the rights of the consumer" | 6-1-1309.5(1)(a), 6-1-1309(3); Rule 8.02(A)(3)–(4), 8.04(A)(5) and (8): "how the benefits of the Processing outweigh the risks" | 30-14-2819(1)(a), 30-14-2814(2)(a) | 3.4 and 5.4 |
| 6 | de-identified data, the reasonable expectations, the context and the relationship | §42-522(b)(2): "factor into each such data protection assessment the use of de-identified data and the reasonable expectations of consumers, as well as the context of the processing and the relationship between the controller and the consumer" | 6-1-1309(3); Rule 8.04(A)(3) and (7)(a) | 30-14-2814(2)(b) | 3.3 and 5.4 |
| 7 | the operational elements: sources, technology and processors, recipients, collection, use, storage, retention and sharing | — | Rule 8.04(A)(4)(a)–(d) | — | 3.1, 3.2 and 3.5; privacy 4 |
| 8 | the safeguards: data security, consent, the consumer's rights, contracts with processors | — | Rule 8.04(A)(7)(b)–(c) and (8)(a) | — | measures 5 and 6; the agreements — 3.5; consent — 5.2; the rights — 5.1. No data security assessment under 6-1-1308(5) has been made |
| 9 | who took part: "Relevant internal actors and external parties" | — | Rule 8.03, 8.04(A)(11) | — | the column "Who" of the log: Claude and the author; no external party — section 4 |
| 10 | an audit of the assessment | — | Rule 8.04(A)(12) | — | none |
| 11 | the dates of review and approval, with "names, positions, and signatures" | — | Rule 8.04(A)(13) | — | the dates — the log; the name and the position — section 7; the signature — on the PDF of each approved version (R147) |
| 12 | review at a material change | §42-529b(c)(1) | 6-1-1309.5(2)(a); Rule 8.05(B) and (D) | 30-14-2819(2)(a) | section 1, the review by R129 |
| 13 | keeping the documentation "for the longer of" three years after the processing ends or as long as the service is offered | §42-529b(c)(2) | 6-1-1309.5(2)(b); Rule 8.05(E): "including prior versions", "in an electronic, transferable form" | 30-14-2819(2)(b) | section 1, "Keeping" |
| 14 | a plan "to mitigate or eliminate" a heightened risk; in Connecticut the Attorney General may ask for it, with 90 days to give it | §42-529b(f) | 6-1-1309.5(5) | 30-14-2819(5) | before the measures, risk 3 is high, and so is risk 4 under 13 (section 7). The plan is table 6.2 and the conditions of section 8, with the open questions and the debts they name |
| 15 | confidentiality, and giving the assessment to the Attorney General | §42-529b(f)–(g); §42-522(d) | 6-1-1309.5(6); Rule 8.06: "within thirty (30) days" of a request | 30-14-2819(6) | the laws keep the assessment out of public records, and do not forbid publishing it; the platform publishes it (the opening note), and gives an Attorney General this version with its date |

### 10.2. The impact assessment of profiling

CGS §42-529b(b) asks for an impact assessment when a service for minors "engages in any profiling". Profiling is "any form of automated processing performed on personal data to evaluate, analyze or predict personal aspects" (§42-515(31)). The learner model evaluates what a learner can do from their attempts, and Claude takes it for profiling, as version 10 did. The assessment holds the following, "to the extent reasonably known by or available to the controller, as applicable":

1. **Purpose, use cases, deployment, benefits.** The law asks for this statement only for profiling "for the purpose of making decisions that produce legal or similarly significant effects", that is, a decision on "education enrollment or opportunity" among others (§42-515(15)). The learner model makes none: it gives no grade or certificate and decides no enrolment or access to education. The choice of a task is no such decision either: the learner may take any skill on the map (concepts 11). All the same: the purpose is to choose the next task — a new skill, consolidation, a repetition by the review date or a probe — within the success corridor (concepts 12). The use is the learner's own lessons and tasks. The model is deployed in `api`, by the libraries `learner-model` and `engine` (architecture 3). The benefit is tasks neither too easy nor too hard, and a return to a skill before it is forgotten.
2. **A heightened risk of harm, its nature and the steps against it.** This is risk 7: a label on a child, or a choice narrowed — "undue restriction on information". Colorado names a related harm as an example: "Intellectual privacy harms, such as the creation of negative inferences about an individual based on what an individual reads, learns, or debates" (Rule 8.04(A)(6)(b)). The model's inference stays within the platform. The learner and the adult of the account see it; nobody else does, it is not sold, and it is deleted with the profile (section 3.1; privacy 7). The steps are measure 7, and the residual risk is low.
3. **Inputs and outputs.** The inputs are the evidence of attempts — how each ended, after which hint, the traps found, each item's verdicts, the techniques, the requests for another explanation, whether the solution was seen — with each task's skills and difficulty, the skill graphs of the connected modules, and the grade a module asks for, which places the start (concepts 11). The work itself does not go in: no picture, no essay. Nor do the pseudonym or the country. The grade sets only the starting estimate, which the evidence then moves. The age category is an input of neither the model nor the engine, but `api` limits the modules, lessons and pool of tasks by it before the engine chooses (concepts 12), and the record of a choice keeps it (privacy 4). A task with a rubric gives no evidence (О-17). The outputs: for each skill, the estimate, its uncertainty, "mastered" with its band, the traps and the review date; a level per module; the skill map; and the engine's choice, with its reason code (concepts 11 and 12).
4. **Data used to customize the profiling.** No learner's data. The algorithms and their constants are `learner-model`'s: the Rasch model with a guessing floor, an Elo update and forgetting. A new variant is admitted only after it passes the learner simulator, by a criterion fixed before the first run (concepts 11).
5. **Transparency.** The policy names the learner model among the data, as "what the learner has shown they can do", and states that a program chooses the next task and that "you can see why it chose it" ("What we collect and why", "Your rights"). The learner sees the skill map. The adult sees each choice's reason code (concepts 12). The texts for a teenager say that the adult sees their progress (measure 16).
6. **Monitoring and safeguards after deployment.** The learner chooses a skill on the map themselves, and ranks do not affect the model (concepts 11). The adult sees the reason codes. The model changes only through the learner simulator (item 4). A family's signal, and every task that changes the model's inputs, is a ground for review (section 1). The platform does not check on real learners whether the choice of tasks serves them: such a check would be a new processing, and this DPIA would be reviewed for it first (section 1).

**Colorado, Rule 9.06(F).** Its twelve elements, by number:
- 1 and 7, the data and the outputs: item 3;
- 2 and 4, the decision and why it belongs to the service: the choice of the next task, item 1;
- 3, the benefit of automated over manual processing: no person can follow every skill's estimate and review date for each learner, and the learner may still choose a skill by hand on the map;
- 5, the training data and the logic: item 4, with no learner's data;
- 6, third-party software: none, since `learner-model` and `engine` are the platform's own open libraries (repositories 2);
- 8, how the outputs are used: only to choose a task, never for a decision on education, enrolment or opportunity (item 1);
- 9, human involvement: none in a single choice, but the learner may override it on the map, and the adult sees its reason;
- 10, how the system is checked "for fairness and disparate impact", and the results: by a criterion of the learner simulator — virtual learners of the same skill but different grades come to the same estimate and the same kind of task within a number of attempts written down before the first run (R147). It has not run yet, so no result is here: a task of `sim` (COORDINATION.md, row 4.16). The age category is not in the criterion: it limits the pool on purpose, by the module's `age_categories`, to content suitable for an age (item 3; concepts 4);
- 11, the safeguards: measure 7 and item 6;
- 12, the data sets the profiling produces: the state of the model and the choices belong to the profile, are exported with it (R135), are deleted with it, and go to nobody (section 3.1).

### 10.3. Risks by the laws' kinds of harm

What each law calls a heightened risk of harm to minors, and the risks of section 6.1 that answer it:
- **unfair or deceptive treatment, unlawful disparate impact** (all three) — risks 7, 12 and 19;
- **financial injury** (all three) — none: there are no purchases and no tariffs for the child, and no economic exploitation (section 6, opening);
- **physical injury** (all three) — risk 3: a disclosure of harm in an essay; **reputational injury** — risks 2 and 13;
- **unauthorized disclosure in a security breach** (Colorado, Montana) — risks 6 and 13; the procedure in a breach is Д200;
- **intrusion upon seclusion or private affairs** (all three) — risks 1, 2, 13 and 15; there is no geolocation (section 5.3, std 10);
- **physical violence, material harassment, sexual abuse or exploitation** (Connecticut, §42-529(5)(D)–(F)) — there is no communication between users and nothing a child does is public (section 6, opening); a disclosure in an essay is risk 3, with the operator's escalation path and §2258A (measure 3);
- **Colorado's further examples, Rule 8.04(A)(6):**
  - constitutional harms — none: nothing is published and nobody speaks to anyone;
  - intellectual privacy and discrimination — risk 7;
  - psychological harm — risk 4;
  - the private life of the home — risks 15 and 18.
