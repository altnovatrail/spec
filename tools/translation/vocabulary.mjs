// The fixed words of the documents, with the English that stands for each in a translation: the
// marks of the decision log and of a component's card in architecture 3. A translation keeps as
// many of each as its original has, unit by unit (R143, the 2026-11-12 amendment). A word that is
// added here is added in both languages, with the italics or the bold it is written in.

const DATE = String.raw`\d{4}-\d{2}-\d{2}`;
const ORDINALS = [
  ["Вторая", "Second"],
  ["Третья", "Third"],
  ["Четвёртая", "Fourth"],
  ["Пятая", "Fifth"],
  ["Шестая", "Sixth"],
  ["Седьмая", "Seventh"],
  ["Восьмая", "Eighth"],
  ["Девятая", "Ninth"],
  ["Десятая", "Tenth"],
];

// [Russian, English]: each a pattern of the Markdown source, the English one also its name.
const WORDS = [
  [String.raw`\*Почему:\*`, String.raw`\*Why:\*`],
  [String.raw`\*Отвергнуто:\*`, String.raw`\*Rejected:\*`],
  [String.raw`\*Следствие:\*`, String.raw`\*Consequence:\*`],
  [String.raw`\*Открыто:\*`, String.raw`\*Open:\*`],
  [String.raw`\*Выяснилось при планировании:\*`, String.raw`\*Found in planning:\*`],
  [String.raw`\*Выяснилось:\*`, String.raw`\*Found:\*`],
  [String.raw`\*Поправка ${DATE}:\*`, String.raw`\*Amendment ${DATE}:\*`],
  ...ORDINALS.map(([ru, en]) => [String.raw`\*${ru} поправка ${DATE}:\*`, String.raw`\*${en} amendment ${DATE}:\*`]),
  [String.raw`«Заменено»`, String.raw`"Superseded"`],
  [String.raw`\*Решить при детализации:\*`, String.raw`\*To decide when detailed:\*`],
  [String.raw`\*Делает:\*`, String.raw`\*Does:\*`],
  [String.raw`\*Не делает:\*`, String.raw`\*Does not:\*`],
  [String.raw`\*Данные и связи:\*`, String.raw`\*Data and links:\*`],
  [String.raw`\*Репозиторий и этап:\*`, String.raw`\*Repository and stage:\*`],
];

export const vocabulary = WORDS.map(([ru, en]) => ({
  ru: new RegExp(ru, "gu"),
  enPattern: new RegExp(en, "gu"),
  en: en.replaceAll("\\", "").replace(DATE.replaceAll("\\", ""), "YYYY-MM-DD"),
}));

// The same words as a table for whoever translates: Russian, then English.
export const table = WORDS.map(([ru, en]) => [ru, en].map((p) => p.replaceAll("\\", "").replace(DATE.replaceAll("\\", ""), "YYYY-MM-DD")));
