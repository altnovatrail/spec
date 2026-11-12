# NovaTrail — источники

> Внешние факты, на которые опираются документы `docs/`: условия поставщиков, законы, стандарты, документация чужих программ и тексты MathTrail. Здесь лежат их записи — адрес, версия или дата страницы, дата прочтения и цитата, — а документы, которые описывают устройство и правила, держат утверждение и ссылку на запись: `(sources 4.1)`, а из другого репозитория — `sources 4.1 spec` (RULES.md, The bar; R143).
>
> Записи собраны по темам. До T133 они стояли в architecture 8, privacy 10 и product 14; там остались указатели сюда, потому что на те разделы ссылаются журнал решений и архивы `docs/plan/`, а их не переписывают (RUN.md, T133). Итоги замеров — в [measurements.md](measurements.md).

## 1. Как вести

- **Запись** — подраздел «N.M» темы: один источник или одно чтение нескольких источников ради одного решения. В ней — адрес, версия или дата страницы, дата прочтения, а цитата — на языке источника. Что не прочитано по первоисточнику — копия, указатель, страница, которая не открылась, — запись так и называет.
- **Ссылка.** Утверждение документа ссылается на запись по номеру, как на раздел любого документа: `(sources 5.4)`. Номер записи не меняется: новая запись встаёт в конец своей темы, новая тема — в конец файла.
- **Перечитали источник** — в запись дописывается пункт со своей датой, а прежний текст не правится: на него опираются решения своего дня. Если источник изменился и утверждение с ним разошлось, это поправка к решению или открытый вопрос, а не правка записи.
- **Чего здесь нет:** цитат, которые приводит сама запись журнала решений, — они остаются в записи (RULES.md, How we work: решение не переписывается); источников DPIA — они в dpia 9, чтобы оценка оставалась цельной (R129); исходных данных части — у таблицы возраста цифрового согласия свои ссылки и цитаты, по стране ([таблица части `consent-age/`](../consent-age/consent-age.yaml)); цитат, на которых стоит способ замеров E10, — цены API в measurements 1.2 и документация Claude Code в measurements 1.5–1.8: их перенесли из repositories 9 вместе с замерами, и `tools/tokens/prices.mjs` сверяют с ценами 1.2. Новая цитата для замера встаёт сюда.

## 2. Поставщики ИИ и агенты разработки

### 2.1. Google: условия Gemini API и Google Cloud

- Google, [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) — раздел Age Requirements; действуют с 23.03.2026, страница обновлена 28.04.2026; прочитано 2026-10-18. 2026-11-03 адрес переадресует на [aistudio.google.com/docs/terms](https://aistudio.google.com/docs/terms): «Effective March 23, 2026», без даты обновления (R96).
- Google Cloud, [Service Specific Terms](https://cloud.google.com/terms/service-terms) — раздел «20. Generative AI Services», «Last modified October 12, 2026», и [Google Cloud Platform Services Summary](https://cloud.google.com/terms/services) — «Last modified October 21, 2026»; обе прочитаны 2026-10-22 (R47), а 2026-11-03 — «Last modified October 30, 2026» у обеих (R96).

### 2.2. OpenAI: несовершеннолетние, данные и договор

Прочитано 2026-10-18, если не сказано иначе:
- [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) — даты на странице нет;
- [Your data](https://developers.openai.com/api/docs/guides/your-data) — о zero data retention; 2026-11-03 — и о том, что одобренный zero data retention модель может потерять (R96);
- договор OpenAI Services Agreement: [страница](https://openai.com/policies/services-agreement/) отвечала 403 и 2026-10-18, и 2026-11-02. Его [PDF](https://cdn.openai.com/osa/openai-services-agreement.pdf) «ONLINE v.010126» прочитал `tutor` 2026-11-01 — п. 3.3(c) (privacy 5.3; architecture 4 tutor), — а `app` 2026-11-02 — вступление, §3.1 и §3.3 (architecture 4 app; R84); сверено 2026-11-02 по PDF. Договор — «between the organization agreeing to these terms», но клиент заверяет, что вправе его заключить, «and, if it is entering into the Agreement for an entity, that it has legal authority to bind that entity»; §3.1 — «Customer will not share Account access credentials or individual login credentials between multiple users»; §3.3(g) — нельзя «buy, sell, or transfer API keys from, to, or with a third party»; End User — и тот, «who accesses the Services under Customer’s Account». Совпадает ли PDF со страницей, не сверено.

### 2.3. Anthropic о своём ключе

Прочитано `app` 2026-11-02 и сверено в тот же день (architecture 4 app; R84): [Commercial Terms](https://www.anthropic.com/legal/commercial-terms), «Effective Jun 17, 2025», — «They govern Customer’s use of Anthropic API keys», пункта о передаче ключа нет; [API key best practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure), изменено 2026-10-19, — «when you upload your API key to third-party tools … you are giving the developer of that tool access to your Claude Console account»; [Can I use the Claude API for individual use?](https://support.claude.com/en/articles/8987200-can-i-use-the-claude-api-for-individual-use), 16.03.2026, — API и у физлиц идёт по Commercial Terms.

### 2.4. Anthropic: несовершеннолетние и хранение

Anthropic, [Responsible use of Anthropic's models: guidelines for organizations serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors) — статья от 16.03.2026, прочитано 2026-10-18, к 2026-11-03 не менялась; [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), даты на странице нет, прочитано 2026-11-03, — модели, которым нужно хранение 30 дней (R96).

### 2.5. Поставщики ИИ, 2026-11-09

Прочитано 2026-11-09 (R121–R123; поправка 2026-11-09 к R47): OpenAI — [Data controls](https://developers.openai.com/api/docs/guides/your-data), [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), а Services Agreement, DPA и Usage Policies — по копиям Wayback Machine от 2026-11-07, 2026-10-28 и 2026-11-06, openai.com отвечает 403; Anthropic — [Commercial Terms](https://www.anthropic.com/legal/commercial-terms), «Effective Jun 17, 2025», [DPA](https://www.anthropic.com/legal/data-processing-addendum), «Effective Feb 24, 2025», [Usage Policy](https://www.anthropic.com/legal/aup), «Effective Nov 12, 2026», [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), [Zero data retention](https://privacy.claude.com/en/articles/8956058), обновлено 2026-10-15, [Covered Models](https://support.claude.com/en/articles/15425695), обновлено 2026-09-01, [статья о несовершеннолетних](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors), обновлено 2026-03-16; Google — [AI Studio terms](https://aistudio.google.com/docs/terms), «Effective March 23, 2026», [Service Specific Terms](https://cloud.google.com/terms/service-terms), «Last modified October 30, 2026», [Google Cloud Platform Terms of Service](https://cloud.google.com/terms), «Last modified October 12, 2026».

### 2.6. Агенты разработки

Прочитано 2026-11-09 (R114): Anthropic, [Claude Code — Data usage](https://code.claude.com/docs/en/data-usage); OpenAI, [How your data is used to improve model performance](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance) — страница отвечала 403, прочитана её копия в Wayback Machine от 2026-11-01.

## 3. Законы, регуляторы и стандарты

### 3.1. COPPA Rule в редакции 2025 года

Прочитано 2026-10-18:
- [16 CFR 312.2](https://www.law.cornell.edu/cfr/text/16/312.2) — «Personal information»: пункт о биометрических идентификаторах и пункт (7) о постоянных идентификаторах, к которым относится IP-адрес. Пункт (7): «A persistent identifier that can be used to recognize a user over time and across different websites or online services. Such persistent identifier includes, but is not limited to, a customer number held in a cookie, an Internet Protocol (IP) address, a processor or device serial number, or unique device identifier»;
- [16 CFR 312.5](https://www.law.cornell.edu/cfr/text/16/312.5) — исключение (c)(9);
- даты поправок — по privacy 2 canvas-api: вступили в силу 23.06.2025, соблюдать — с 22.04.2026.

### 3.2. GDPR и кодекс ICO

Прочитано 2026-10-18: GDPR: ст. 8 — возраст цифрового согласия; ст. 35 — DPIA; преамбула 26 — псевдонимизация. UK Age Appropriate Design Code.

### 3.3. Согласие и аккаунт, 2026-11-09

Прочитано 2026-11-09 (R116–R118; поправка 2026-11-09 к R115):
- COPPA — 16 CFR 312 в редакции правила FTC 2025 года, [90 FR 16918](https://www.govinfo.gov/content/pkg/FR-2025-04-22/html/2025-05904.htm), опубликовано 2025-04-22, действует с 2025-06-23, соблюдать — с 2026-04-22; текст части — по API eCFR на 2026-11-05; FTC, «Complying with COPPA: Frequently Asked Questions» — по копии Wayback Machine от 2026-10-13, страница отвечает 403; 28 U.S.C. § 2462 — [Cornell LII](https://www.law.cornell.edu/uscode/text/28/2462);
- GDPR — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679); EDPB 05/2020 о согласии, v1.1, 07/2020 о контролёре и обработчике, v2.1, 2/2019 о ст. 6(1)(b), v2.0; WP260 rev.01 о прозрачности; UK GDPR, [ст. 8](https://www.legislation.gov.uk/eur/2016/679/article/8);
- ICO, Age Appropriate Design Code — standards 1–4, 7, 10 и 11 и «Services covered by this code», — и страницы о детях и UK GDPR — по копиям Wayback Machine от 2026-04-28 до 2026-10-30, сайт отвечает 403, а страницы о детях помечены «this guidance is under review» после Data (Use and Access) Act 2025;
- Firebase — [Terms](https://firebase.google.com/terms), «Terms last modified: September 24, 2026», [Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms), «Last Updated: August 21, 2024», [Privacy and Security in Firebase](https://firebase.google.com/support/privacy), «Last modified: September 24, 2026»; Google Cloud — [Terms of Service](https://cloud.google.com/terms), «Last modified March 24, 2026», и [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum); Neon — [Product Specific Schedule (Neon)](https://neon.com/dpa), «Last Updated: October 14, 2026», Databricks — [subprocessors](https://www.databricks.com/legal/databricks-subprocessors), «Last Updated: June 9, 2026»;
- озвучка — исходники Chromium, [chromium.googlesource.com](https://chromium.googlesource.com/chromium/src), ветка `main`: `speech_synthesis_impl.cc`, `tts_android.cc` и `tts_linux.cc`; Android, [Voice](https://developer.android.com/reference/android/speech/tts/Voice).

### 3.4. Образцы, eval-наборы и сочинения, 2026-11-09

Прочитано 2026-11-09 (R124–R128):
- GDPR — ст. 4(1), 4(14), 4(15), 6(1)(d), 9 и 17(3)(e), преамбулы 35, 46 и 51, — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679); CJEU, [C-434/16 Nowak](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:62016CJ0434), 20 декабря 2017; WP29, [WP193](https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp193_en.pdf), 27 апреля 2012; EDPB, [Guidelines 3/2019](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201903_video_devices_en_0.pdf), v2.0;
- ICO — Biometric recognition, по копии Wayback Machine от 2026-09-25, помечена «under review»; What is special category data, «Latest update - 9 April 2024», — по копии от 2026-10-17; A 10 step guide to sharing information to safeguard children — по копии от 2026-10-15; сайт отвечает 403;
- COPPA — 16 CFR 312 по API eCFR на 2026-11-05: §312.2, 312.4(d)(3), 312.5(c)(7), 312.8(c) и 312.10; CCPA, 1798.140(c), — [текст California Privacy Protection Agency](https://cppa.ca.gov/regulations/pdf/cppa_act.pdf); BIPA, 740 ILCS 14/10, и Mississippi, §1-3-27, — по копиям FindLaw, «Current as of January 01, 2025»: первоисточники не открылись;
- совершеннолетие — Alabama Code §26-1-1, Nebraska Rev. Stat. [§43-2101](https://nebraskalegislature.gov/laws/statutes.php?statute=43-2101), [Age of Legal Capacity (Scotland) Act 1991, s.1](https://www.legislation.gov.uk/ukpga/1991/50/section/1), NY [Gen. Oblig. Law §3-101](https://www.nysenate.gov/legislation/laws/GOB/3-101); [DCO 1.1](https://developercertificate.org/);
- обязанность сообщать — 18 U.S.C. [§2258A](https://www.law.cornell.edu/uscode/text/18/2258A); Child Welfare Information Gateway, [Mandatory Reporting of Child Abuse and Neglect](https://www.childwelfare.gov/resources/mandatory-reporting-child-abuse-and-neglect/), «Current Through 05-31-2023»; [Crime and Policing Act 2026, s.85](https://www.legislation.gov.uk/ukpga/2026/20/section/85), «Prospective»; Samaritans, [Supporting user wellbeing](https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/guidelines-tech-industry/supporting-user-wellbeing/), даты на странице нет;
- Firebase и Google — [Firebase Terms](https://firebase.google.com/terms), «Terms last modified: September 24, 2026»; [Firebase Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms), «Terms last modified: August 21, 2024»; [Privacy and Security in Firebase](https://firebase.google.com/support/privacy), «Last modified: September 24, 2026»; [Hosting web request logs](https://firebase.google.com/docs/hosting/web-request-logs-and-metrics), «Last updated 2026-11-05 UTC»; [Google APIs Terms of Service](https://developers.google.com/terms), «Last modified: November 9, 2021»; [Controller-Controller Data Protection Terms](https://business.safety.google/controllerterms/), версия 11 от 7 мая 2026, и [их список служб](https://business.safety.google/services/), «Last update: 27 April 2026»; [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) и [Google Cloud Services Summary](https://cloud.google.com/terms/services), «Last modified October 30, 2026».

### 3.5. Тексты для взрослых, 2026-11-09

Прочитано 2026-11-09 (R131; RUN.md, T97): COPPA — 16 CFR 312 по [API eCFR](https://www.ecfr.gov/api/versioner/v1/full/2026-11-05/title-16.xml?part=312) на 2026-11-05, §312.2 («Support for the internal operations»), 312.4(b)–(d), 312.5(a), 312.6, 312.7 и 312.10, в редакции от 2025-06-23; GDPR — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679), ст. 3(2), 12(3), 13, 14(1)(d) и 14(2)(f), 27 и 77(1); UK GDPR — [ст. 3](https://www.legislation.gov.uk/eur/2016/679/article/3) и [ст. 27](https://www.legislation.gov.uk/eur/2016/679/article/27), редакция от 2026-09-30; кодекс ICO, std 4, — копия Wayback Machine от 2026-09-26, сайт отвечает 403; передача в США — [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum), «Last modified October 30, 2026», [Alternative Transfer Solution](https://cloud.google.com/terms/alternative-transfer-solution), «Last modified September 29, 2026», и [SCC модуля 2](https://cloud.google.com/terms/sccs/eu-c2p), «Last modified August 17, 2023»; [Firebase Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms), §10.2 и 10.6, и [SCC Firebase](https://firebase.google.com/terms/firebase-sccs-eu-c2p), «Last modified: September 21, 2022»; [Product Specific Schedule (Neon)](https://neon.com/platform-terms), «Last Updated: October 14, 2026», [Master Cloud Services Agreement](https://www.databricks.com/legal/mcsa), «Last Updated February 20, 2026», [Databricks DPA v3](https://www.databricks.com/legal/dpa), 2023-07-21, и [International Data Transfers FAQ](https://www.databricks.com/legal/tia-faq), «Last updated: April 23, 2026»; [OpenAI DPA](https://openai.com/policies/data-processing-addendum), «Updated: December 1, 2025», — копия Wayback Machine от 2026-10-28, openai.com отвечает 403; [Anthropic DPA](https://www.anthropic.com/legal/data-processing-addendum), «Effective Feb 24, 2025»; список [Data Privacy Framework](https://www.dataprivacyframework.gov/list) — по API, которое зовёт страница: Google LLC и Databricks, Inc. с Neon, LLC — «Active», ЕС и UK Extension, а OpenAI и Anthropic в нём нет; что сервис входа берёт у Google — [Users in Firebase Projects](https://firebase.google.com/docs/auth/users), «Last updated 2026-11-05 UTC»: «a unique ID, a primary email address, a name and a photo URL», и [UserRecord](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.userrecord), «Last updated 2026-11-06 UTC»; сроки Firebase сверены по [Privacy and Security in Firebase](https://firebase.google.com/support/privacy), «Last modified: September 24, 2026».

### 3.6. Возраст цифрового согласия, 2026-11-10

Прочитано 2026-11-10 (R134; RUN.md, T100): закон каждой страны ЕС и ЕЭЗ, Великобритании и США — по официальному тексту, ссылка и цитата — у записи страны в [таблице части `consent-age/`](../consent-age/consent-age.yaml); там, где официальный сайт не открылся, — копия Wayback Machine официальной страницы, а у Кипра — CyLaw, портал коллегии адвокатов, с копией Официального вестника, и запись это называет. GDPR, ст. 8(1), — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679); UK GDPR — [ст. 8](https://www.legislation.gov.uk/eur/2016/679/article/8); COPPA — 16 CFR §312.2 по [API eCFR](https://www.ecfr.gov/api/versioner/v1/full/2026-11-01/title-16.xml?part=312&section=312.2) на 2026-11-01. Коды стран — ISO 3166-1, как их держит проект iso-codes Debian ([`data/iso_3166-1.json`](https://salsa.debian.org/iso-codes-team/iso-codes/-/blob/d055275324963c9bce5882eaaa93024cf2bf7ed0/data/iso_3166-1.json), коммит d055275).

### 3.7. Оператор в текстах, 2026-11-10

Прочитано 2026-11-10 (R137): COPPA — 16 CFR [§312.4(d)(1)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.4) по eCFR; FTC, [Complying with COPPA: Frequently Asked Questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), C.2, — живая страница, без даты обновления; CAN-SPAM — 16 CFR [§316.2(p)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316/section-316.2); 28 U.S.C. [§124(d)(4)](https://www.law.cornell.edu/uscode/text/28/124), LII; Google, [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) — о Google Workspace, П-29.

### 3.8. Законы штатов США, 2026-11-10

Прочитано 2026-11-10 (R140; privacy 3.4): Техас — [Bus. & Com. Code ch. 541](https://tcss.legis.texas.gov/resources/BC/htm/BC.541.htm), [ch. 509](https://tcss.legis.texas.gov/resources/BC/htm/BC.509.htm), [§503.001](https://tcss.legis.texas.gov/resources/BC/htm/BC.503.htm), [Education Code ch. 32](https://tcss.legis.texas.gov/resources/ED/htm/ED.32.htm), [SB 2420](https://capitol.texas.gov/tlodocs/89R/billtext/html/SB02420F.htm) и приказ Пятого округа по нему, [25-51073](https://www.ca5.uscourts.gov/opinions/pub/25/25-51073-CV0.pdf); SBA — [13 CFR 121.201](https://www.ecfr.gov/current/title-13/part-121); Нью-Йорк — [GBL §899-ee и далее](https://www.nysenate.gov/legislation/laws/GBS/899-EE); Коннектикут — [chap. 743jj, 2026 Supplement](https://www.cga.ct.gov/2026/sup/chap_743jj.htm); Колорадо — [SB 24-041](https://leg.colorado.gov/bill_files/46008/download) и [HB 24-1130](https://leg.colorado.gov/bill_files/42280/download); Монтана — [SB 297, ch. 567](https://archive.legmt.gov/content/Sessions/69th/Contractor_index/CH0567.pdf); Арканзас — [Act 952 of 2025](https://arkleg.state.ar.us/Acts/FTPDocument?path=%2FACTS%2F2025R%2FPublic%2F&file=952.pdf&ddBienniumSession=2025%2F2025R); Род-Айленд — [§6-48.1-3](https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/6-48.1-3.htm); Вермонт — [Act 63 of 2025](https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT063/ACT063%20As%20Enacted.pdf) и [Act 145 of 2026](https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20As%20Enacted.pdf); Калифорния — [CCPA по тексту CPPA](https://cppa.ca.gov/regulations/pdf/cppa_act.pdf) и решение по AADC, [NetChoice v. Bonta, 25-2366](https://cdn.ca9.uscourts.gov/datastore/opinions/2026/03/12/25-2366.pdf); Мэриленд — [§14-4702](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4702) и [§14-4801](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4801); Небраска — [87-1103](https://nebraskalegislature.gov/laws/statutes.php?statute=87-1103) и [87-1302](https://nebraskalegislature.gov/laws/statutes.php?statute=87-1302); Техас ещё — [ch. 551–552](https://tcss.legis.texas.gov/resources/BC/htm/BC.552.htm) и [ch. 521](https://tcss.legis.texas.gov/resources/BC/htm/BC.521.htm); Миннесота — [325M.12](https://www.revisor.mn.gov/statutes/cite/325M.12); Вашингтон — [RCW 19.373](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373) и [RCW 19.375](https://app.leg.wa.gov/RCW/default.aspx?cite=19.375); Иллинойс — [740 ILCS 14](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004); Калифорния ещё — Bus. & Prof. Code §22584, SOPIPA, и AB 1043, по копиям leginfo; Юта — [13-61](https://le.utah.gov/xcode/Title13/Chapter61/C13-61-S102_2024050120240501.html), [HB 498 (2026)](https://le.utah.gov/Session/2026/bills/enrolled/HB0498.pdf) и 13-71-101; Флорида — §501.1736; Вирджиния — [59.1-576](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-576/); Айова — [715D](https://www.legis.iowa.gov/docs/code/715D.pdf); Индиана — [24-15](https://iga.in.gov/ic/2026/Title_24/Article_15.pdf); Теннесси — [Pub. Ch. 408 (2023)](https://publications.tnsosfiles.com/acts/113/pub/pc0408.pdf); Кентукки — [367.3613](https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=56648); Нью-Джерси — [P.L.2023, c.266](https://pub.njleg.gov/bills/2022/PL23/266_.HTM); Нью-Гэмпшир — [RSA 507-H](https://gc.nh.gov/rsa/html/LII/507-H/507-H-mrg.htm); Орегон — [ORS 646A](https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html); Делавэр — [ch. 12D](https://delcode.delaware.gov/title6/c012d/index.html), а порог 2027 года — по указателям юрфирм; Оклахома — SB 546, по oklegislature.gov; Алабама — [HB 351](https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/HB351-enr.pdf); Луизиана — [SB 386, Act 502](https://legis.la.gov/legis/ViewDocument.aspx?d=1480202). Законы о соцсетях Теннесси, Джорджии, Арканзаса и Луизианы и закон Луизианы о магазинах приложений прочитаны по указателям, не по текстам. Часть текстов — по копиям Wayback Machine, где сайт закрыт для автоматического чтения; что не проверено по первоисточнику, R140 называет.

### 3.9. Тексты для семьи и версия 2 политики, 2026-11-11

Прочитано 2026-11-11 (R141; privacy 3.4): Коннектикут — CGS ch. 743jj с поправкой PA 25-113 по [2026 Supplement](https://www.cga.ct.gov/2026/sup/chap_743jj.htm), §42-515(39), 42-516, 42-518, 42-520, и [страница жалоб генеральному прокурору](https://portal.ct.gov/ag/common/complaint-form-landing-page), которая ведёт к его [форме электронной жалобы](https://www.dir.ct.gov/ag/complaint/) с темой «Consumer Data Privacy» для жалоб по CTDPA; Арканзас — [Act 952 of 2025](https://www.arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2025R%2FPublic%2FACT952.pdf), A.C.A. §4-88-1502, 4-88-1503; Нью-Йорк — GBL [§899-gg](https://www.nysenate.gov/legislation/laws/GBS/899-GG), [§899-hh](https://www.nysenate.gov/legislation/laws/GBS/899-HH) и [§899-ii](https://www.nysenate.gov/legislation/laws/GBS/899-II); Техас — [Bus. & Com. Code ch. 541](https://tcss.legis.texas.gov/resources/BC/htm/BC.541.htm), §541.002, 541.107. Договоры обработчиков против §899-gg (П-30): [OpenAI](https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf), версия v.010126, — PDF на её CDN, веб-страница отдала 403; [Anthropic](https://www.anthropic.com/legal/data-processing-addendum); [Google Cloud](https://cloud.google.com/terms/data-processing-addendum) и [условия Firebase](https://firebase.google.com/terms); [Databricks](https://www.databricks.com/sites/default/files/legal/dpa-20230721.pdf) с [приложением Neon](https://neon.com/platform-terms). Почтовые сервисы с договором обработчика (поправка 2026-11-11 к R138): [Fastmail](https://www.fastmail.com/pricing/) и [его договор](https://www.fastmail.com/policies/dpa/), [Proton Mail](https://proton.me/mail/pricing) и [его договор](https://proton.me/legal/dpa), [Zoho Mail](https://www.zoho.com/mail/zohomail-pricing.html), [Google Workspace](https://knowledge.workspace.google.com/admin/getting-started/editions/business-editions).

### 3.10. Законы и стандарты доступности

Прочитано `app` 2026-11-02 (architecture 4 app; П-25): [директива (ЕС) 2019/882](https://publications.europa.eu/resource/celex/32019L0882), European Accessibility Act, — текст Publications Office, EUR-Lex не открылся; ETSI, [EN 301 549 V4.1.1 (2026-09)](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf), пункт 9.0; Европейская комиссия, [AccessibleEU](https://accessible-eu-centre.ec.europa.eu/content-corner/news/european-accessibility-standard-en-301-549-has-been-updated-2026-09-07_en), 7 сентября 2026 года, — сверено 2026-11-02; DOJ, [89 FR 31320](https://www.federalregister.gov/d/2024-07758), 24 апреля 2024 года, и [interim final rule](https://www.federalregister.gov/d/2026-07663), 20 апреля 2026 года, — federalregister.gov 2026-11-02 сверить не пустил; [ada.gov](https://www.ada.gov/resources/web-guidance/), 18 марта 2022 года; [Equality Act 2010, s. 29](https://www.legislation.gov.uk/ukpga/2010/15/section/29) и [Schedule 2, para 2](https://www.legislation.gov.uk/ukpga/2010/15/schedule/2/paragraph/2); [gov.uk](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps), обновлено 30 сентября 2024 года; [181-ФЗ, статья 15](https://www.consultant.ru/document/cons_doc_LAW_8559/1f3d91284a26982ce51392b5fd178e392fe53404/), ред. от 29.12.2025; [162-ФЗ, статья 26](https://www.consultant.ru/document/cons_doc_LAW_181810/0b41c80a4b380c5845a29b37afa6f49390738b18/); ГОСТ Р 52872-2019 — по тексту правовой базы [Гарант](https://base.garant.ru/73664694/), а docs.cntd.ru не ответил.

## 4. Облачные сервисы

### 4.1. Google Cloud: журналы запросов Cloud Run

Прочитано 2026-10-18 — Google Cloud, [Cloud Run: logging](https://docs.cloud.google.com/run/docs/logging) — обновлено 2026-10-13:
- «Request logs (services only): logs of requests sent to Cloud Run services. These logs are created automatically»;
- «Although you cannot control the amount of request logs directly from Cloud Run, you can make use of the logs exclusion feature from Cloud Logging».

### 4.2. Google Cloud: LogEntry, HttpRequest

Прочитано 2026-10-18 — Google Cloud, [LogEntry, HttpRequest](https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry) — обновлено 2026-09-04. Поле `remoteIp`: «The IP address (IPv4 or IPv6) of the client that issued the HTTP request».

### 4.3. Google Cloud о журналах, 2026-11-08

Прочитано `infra` 2026-11-08 и сверено разбором в тот же день (architecture 4 infra; П-9; R07 infra): [Route log entries](https://docs.cloud.google.com/logging/docs/routing/overview), [Cloud Audit Logs overview](https://docs.cloud.google.com/logging/docs/audit), [Quotas and limits](https://docs.cloud.google.com/logging/quotas) — обновлены 2026-11-06; [Identity Platform audit logging](https://docs.cloud.google.com/identity-platform/docs/audit-logging) — обновлена 2026-11-03.

### 4.4. Firebase: Privacy and Security in Firebase

Firebase, [Privacy and Security in Firebase](https://firebase.google.com/support/privacy) — «Last updated 2026-10-29 UTC», прочитана 2026-11-02: где Firebase Auth обрабатывает данные и сколько хранит IP-адреса и данные пользователя после его удаления (П-9, П-11; R03 api). 2026-11-08 — «Last modified: September 24, 2026», прочитана `infra` и сверена разбором: Firebase Hosting — среди «Global services», и «Hosting retains IP data for a few months» (П-9; R06 infra).

### 4.5. Neon и Databricks

Прочитано `api` 2026-11-02 (architecture 4 api; П-9, П-11, privacy 2): [Regions](https://neon.com/docs/introduction/regions); [History window](https://neon.com/docs/postgres/backup-restore/history-window), даты на странице нет; [Neon Platform Terms](https://neon.com/platform-terms), «Last Updated: October 14, 2026» — приложение Neon к DPA Databricks, о детях и несовершеннолетних в нём ничего нет; [Databricks Subprocessors](https://www.databricks.com/legal/databricks-subprocessors), «Last Updated: June 9, 2026»: «Amazon Web Services, Inc. Cloud Service Provider United States Customer Selected».

## 5. Веб-платформа и озвучка

### 5.1. HTML Standard: `sandbox` у `iframe`

Прочитано 2026-10-19 — [HTML Standard](https://html.spec.whatwg.org/multipage/iframe-embed-object.html), атрибут `sandbox` у `iframe` — обновлено 16.10.2026:
- «When the attribute is set, the content is treated as being from a unique opaque origin, forms, scripts, and various potentially annoying APIs are disabled, and links are prevented from targeting other navigables»;
- «Setting both the allow-scripts and allow-same-origin keywords together when the embedded page has the same origin as the page containing the iframe allows the embedded page to simply remove the sandbox attribute and then reload itself, effectively breaking out of the sandbox altogether».

### 5.2. HTML Standard: origin и обмен сообщениями

Прочитано 2026-10-21 — [HTML Standard](https://html.spec.whatwg.org/multipage/), обновлено 20.10.2026 (architecture 3.4):
- [Origins](https://html.spec.whatwg.org/multipage/browsers.html#concept-origin-opaque), о непрозрачном origin: «An internal value, with no serialization it can be recreated from (it is serialized as "null" per serialization of an origin), for which the only meaningful operation is testing for equality»;
- [Cross-document messaging, Authors](https://html.spec.whatwg.org/multipage/web-messaging.html#authors): «Authors should check the origin attribute to ensure that messages are only accepted from domains that they expect to receive messages from»;
- [Ports as the basis of an object-capability model on the web](https://html.spec.whatwg.org/multipage/web-messaging.html#ports-as-the-basis-of-an-object-capability-model-on-the-web), раздел не нормативный: «Ports can be viewed as a way to expose limited capabilities (in the object-capability model sense) to other actors in the system»;
- [The WindowProxy exotic object](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-windowproxy-exotic-object): «Each browsing context has an associated WindowProxy object. When the browsing context is navigated, the Window object wrapped by the browsing context's associated WindowProxy object is changed».

### 5.3. web.dev: Shadow DOM

Прочитано 2026-10-19 — web.dev, [Shadow DOM v1 — Self-Contained Web Components](https://web.dev/articles/shadowdom-v1) — обновлено 2016-08-01: «Shadow DOM is not a security feature. It's a lightweight tool for scoping CSS and hiding away DOM trees in component».

### 5.4. Озвучка синтезом речи устройства

- Прочитано 2026-10-18 — [Web Speech API](https://webaudio.github.io/web-speech-api/) — Draft Community Group Report от 15.10.2026. Атрибут `localService`: «This attribute is true for voices supplied by a local speech synthesizer, and is false for voices supplied by a remote speech synthesizer service».
- Прочитано 2026-11-02 — озвучка синтезом речи устройства (Т-13; privacy 6; R07 app). Цитаты сверены `curl` с текстом страниц и файлов; что выведено из кода, а не сказано поставщиком, так и названо:
  - [Web Speech API](https://webaudio.github.io/web-speech-api/) — Draft Community Group Report от 27.10.2026. Его [README](https://github.com/WebAudio/web-speech-api): «This is an incubaiton with no official status. This is not a standard.» — опечатка источника. Атрибут `localService` описан той же фразой, что 2026-10-18, выше. Голос фразы: «If this attribute is unset or null at the time of the speak() method call, then the user agent must use a user agent default voice», а этот голос «can be a local or remote speech service».
  - Chromium, ветка `main`, коммит 88a24da:
    - [`manifest.json`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/chrome/browser/resources/network_speech_synthesis/manifest.json): «Component extension providing speech via the Google network text-to-speech service.», а у голосов «Google US English» и «Google русский» — `"remote": true`. [`tts_extension.js`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/chrome/browser/resources/network_speech_synthesis/tts_extension.js): адрес `https://www.google.com/speech-api/v2/synthesize?` и `url += '&text=' + encodeURIComponent(utterance);`;
    - [`speech_synthesis_impl.cc`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/content/browser/speech/speech_synthesis_impl.cc): `out_voice->is_local_service = !voices[i].remote;`. [`component_loader.cc`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/chrome/browser/extensions/component_loader.cc): `#if BUILDFLAG(GOOGLE_CHROME_BRANDING) && !BUILDFLAG(IS_CHROMEOS)` перед `AddNetworkSpeechSynthesisExtension();` — сетевые голоса Google есть только у Chrome от Google и не у ChromeOS;
    - [`tts_controller_impl.cc`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/content/browser/speech/tts_controller_impl.cc): голос, которого фраза не называет, Chrome подбирает по очкам — язык фразы, нужные события, язык приложения — и «Start with a best score of -1, that way even if none of the criteria match, something will be returned if there are any voices». Локальности среди очков нет: это чтение кода;
    - [`TtsPlatformImpl.java`](https://chromium.googlesource.com/chromium/src/+/88a24da8ad5dbef9b947545887d4da2c33f45759/content/public/android/java/src/org/chromium/content/browser/TtsPlatformImpl.java): на Android голос — `new TtsVoice(name, locale.toString())`, без пометки «сетевой», и `localService` истинен у каждого голоса. Это чтение кода.
  - Microsoft, [Microsoft Edge Privacy Whitepaper](https://learn.microsoft.com/en-us/microsoft-edge/privacy-whitepaper/), дата страницы — 31.08.2026, раздел «Read aloud» — о чтении вслух в Edge, а не о Web Speech API: «If your content is converted to speech by using a client-side library, no information is sent to Microsoft servers.»; «If your content is converted to speech by using Azure Cognitive Services (as indicated by the word "Online" in any of the voice names), the text, along with a randomly generated token, is sent to Microsoft.» Ставит ли Edge голосам «Online» `localService` ложным, Microsoft не пишет.
  - WebKit, ветка `main`, коммит 72780a2, [`PlatformSpeechSynthesizerCocoa.mm`](https://github.com/WebKit/WebKit/blob/72780a2/Source/WebCore/platform/cocoa/PlatformSpeechSynthesizerCocoa.mm): `if (voice.isSystemVoice)` и `/* localService */ true, /* isDefault */ true` — только голоса системы Apple, и `localService` истинен у каждого. Это чтение кода.
  - Android, [Voice](https://developer.android.com/reference/android/speech/tts/Voice), `isNetworkConnectionRequired()`: «Does the Voice require a network connection to work».
  - speech-dispatcher, ветка `master`, коммит 8972b11: [README](https://github.com/brailcom/speechd/blob/8972b11/README.md) называет среди синтезов «Edge TTS», а [`edgetts-generic.conf`](https://github.com/brailcom/speechd/blob/8972b11/config/modules/edgetts-generic.conf) — «It uses the edge-tts command-line client to synthesize speech» и передаёт ему текст `$DATA`. [edge-tts](https://github.com/rany2/edge-tts/blob/bd44c1d/README.md), коммит bd44c1d: «`edge-tts` is a Python module that allows you to use Microsoft Edge's online text-to-speech service».
  - Остальное, что `app` прочитал об озвучке, — architecture 4 app.

## 6. GitHub

### 6.1. Файлы сообщества и профиль организации

GitHub Docs:
- прочитано 2026-10-19:
  - [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file): «You can add default community health files to a repository called .github. The .github repository must be public»;
  - [Customizing your organization's profile](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/customizing-your-organizations-profile): «In your organization's .github repository, create a README.md file in the profile folder».
- прочитано 2026-11-01:
  - [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file): «Store issue templates and their configuration file in `.github/ISSUE_TEMPLATE`» и «if a repository defines valid issue templates or issue template configuration in its own `.github/ISSUE_TEMPLATE` folder, none of the contents of the default `.github/ISSUE_TEMPLATE` folder will be used»;
  - [Creating a pull request template for your repository](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository): «You can create default pull request templates for your organization or personal account».

## 7. Go, лицензии и права на тексты

### 7.1. Go: выход программы

Go — [The Go Programming Language Specification](https://go.dev/ref/spec), раздел Program execution: «When that function invocation returns, the program exits. It does not wait for other (non-main) goroutines to complete.» Language version go1.27 (May 26, 2026); прочитано 2026-10-19. К О-20.

### 7.2. MathNet

MathNet — карточка набора [ShadenA/MathNet](https://huggingface.co/datasets/ShadenA/MathNet) на Hugging Face, на которую ссылается mathnet.mit.edu, коммит 33e6b3b, «License», прочитано 2026-11-02: «Where a country or contest organization asserts its own copyright, that copyright is retained and takes precedence… For all remaining problems where no explicit copyright was asserted, the dataset is released under Creative Commons Attribution 4.0 International (CC BY 4.0)» и «In short: use freely, cite the paper, and respect any explicit rights claimed by the original national team». К О-10.

### 7.3. CC BY 4.0

CC BY 4.0 — [Legal Code](https://creativecommons.org/licenses/by/4.0/legalcode.en), пункт 8(a), прочитано 2026-11-02: «For the avoidance of doubt, this Public License does not, and shall not be interpreted to, reduce, limit, restrict, or impose conditions on any use of the Licensed Material that could lawfully be made without permission under this Public License.» К О-10.

### 7.4. TRIPS

TRIPS — [Agreement on Trade-Related Aspects of Intellectual Property Rights](https://www.wto.org/english/docs_e/legal_e/27-trips_04_e.htm), статья 9, пункт 2, прочитано 2026-11-02: «Copyright protection shall extend to expressions and not to ideas, procedures, methods of operation or mathematical concepts as such.» К О-10.

### 7.5. ASF: LICENSE и NOTICE

ASF — [Assembling LICENSE and NOTICE files](https://infra.apache.org/licensing-howto.html), «Modifications to NOTICE», прочитано 2026-11-02: «Do not add anything to NOTICE which is not legally required.» Каждый, кто распространяет производную работу, несёт `NOTICE` дальше — Apache-2.0, пункт 4(d) ([LICENSE](../LICENSE)): «any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file». К О-10.

## 8. MathTrail, прототип и тексты вне репозитория

### 8.1. MathTrail Canvas

- [mathtrail/canvas-api](https://github.com/mathtrail/canvas-api), документы `docs/` — product, spec, decisions, privacy; коммит 0901af0 от 2026-10-18.
- MathTrail Canvas, [docs/](https://github.com/mathtrail/canvas-api/tree/main/docs) — коммит 0901af0:
  - spec и self-hosting;
  - решения canvas-api: R15, R43, R47, R52;
  - privacy 4: «Платформенные журналы запросов Cloud Run и Firebase Hosting сами пишут IP-адрес и user agent».
- MathTrail Canvas, [docs/privacy.md](https://github.com/mathtrail/canvas-api/blob/main/docs/privacy.md) — коммит 0901af0.

### 8.2. mathtrail-standalone

- [mathtrail/mathtrail-standalone](https://github.com/mathtrail/mathtrail-standalone) — SPEC, `docs/learners.md`, `docs/grants/`; коммит c6cbeb2 от 2026-10-14.
- [mathtrail-standalone](https://github.com/mathtrail/mathtrail-standalone) — коммит c6cbeb2: SPEC (2 — модель ученика, 6.6 — песочница решателей), `docs/architecture/`, `docs/learners.md`.
- [mathtrail/mathtrail-standalone на коммите 89986bc](https://github.com/mathtrail/mathtrail-standalone/tree/89986bc) от 2026-11-01, прочитано 2026-11-02, — к числам product 2 и 10 и к О-10:
  - SPEC 1.5: «Nobody else's wording, anywhere. The ideas come from open sources; the text is ours». SPEC 1.6: «Grades 1–4 — 450 tasks, 442 of them the prototype's» и «Grades 5–6 — 153 new tasks», а ещё 102 добавил R309 standalone;
  - `site/content/en/research.yaml`, раздел «Where the ideas of the tasks came from»: книги Перельмана, Игнатьева, Дьюдени, Лойда и Кэрролла — «In the public domain»; MathNet — «Some countries keep the rights to their problems, so from it, too, only an idea is taken, never a text»; GSM8K — «the kind of problem behind some reference tasks comes from it, and the texts of those tasks are written anew»; problems.ru — «their texts are protected, so from them, too, only an idea or a kind of problem is taken, never a text. A reference task has no field for its source, so the author of a task's idea cannot be named».
- [mathtrail/mathtrail-standalone на коммите 42b4408](https://github.com/mathtrail/mathtrail-standalone/tree/42b4408) от 2026-11-07, прочитано 2026-11-08, — к числам product 2 и 10 и к О-10: `content/examples/` — 753 задачи, `content/solvers/` — 39 шаблонов, `content/catalogs/topics.json` — 19 тем; SPEC 1.2: «A task may also be solved from its picture… Seventeen genres are such tasks: two topics of their own hold five of them, and today's topics the other twelve»; SPEC 1.5 — по-прежнему «Nobody else's wording, anywhere».

### 8.3. Прототип standalone

Прототип standalone — [MathTrail/llm-taskgen-prototype](https://github.com/MathTrail/llm-taskgen-prototype/tree/0263835), коммит 0263835, прочитано 2026-11-02: `LICENSE` — Apache-2.0, файла `NOTICE` нет; D23 в `docs/decisions.md` — «450 tasks written by Claude, reviewed by the author… Problem wording is never copied». К О-10.

### 8.4. Тексты вне репозитория

- Диалог автора с Gemini о платформе, 2026-10-18, — в репозиторий не входит; доводы, на которые здесь опираемся, пересказаны в R16 и R18.
- Анализ автора «Базовая канва и контракт „канва ↔ агент“», который автор прислал 2026-10-21, — в репозиторий не входит. Его писала модель, которая не видела ни кода, ни принятых решений NovaTrail, поэтому из него взяты вопросы, а не факты: О-21, вариант О-8, architecture 3.4 и Т-30.

### 8.5. Документы NovaTrail и прототип

Внутренние: [decisions.md](decisions.md), [concepts.md](concepts.md), [privacy.md](privacy.md), [architecture.md](architecture.md), [repositories.md](repositories.md); прототип — [draft/README.md](../draft/README.md).
