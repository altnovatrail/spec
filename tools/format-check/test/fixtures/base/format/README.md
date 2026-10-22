# A trial format

A small format for the tests of format-check. It lists its rules in tables, as the text of the module format does.

## 4. Writing a module

| ID | Rule |
|---|---|
| `yaml.encoding` | The file MUST be UTF-8, with no byte order mark. |
| `yaml.single-document` | The file MUST hold exactly one document. |
| `yaml.no-directives` | The file MUST NOT contain directives. |
| `yaml.no-anchors` | The file MUST NOT contain anchors or aliases. |
| `yaml.no-tags` | The file MUST NOT contain tags. |
| `yaml.string-keys` | Every key MUST be a string. |
| `yaml.unique-keys` | Two keys of one mapping MUST NOT be the same string. |
| `yaml.json-scalars` | A plain null, true, false or JSON number is that value. |
| `yaml.plain-strings` | Any other plain scalar is a string, written so that every parser reads it so. |
| `yaml.characters` | A key or a string MUST NOT contain a surrogate or a noncharacter. |

## 7. Format rules

| ID | Rule |
|---|---|
| `sample.known-tag` | Every tag of a sample MUST be one its module defines. |
