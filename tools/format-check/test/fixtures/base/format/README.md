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

## 10. A module

| Path | Part | Holds |
|---|---|---|
| `manifest.yaml` | `manifest` | The manifest. |
| `sample.yaml` | `sample` | A sample. |
| `samples/<id>.yaml` | `sample` | Samples, a file for each, named by its id. |
| `media/<path>` | — | Pictures and sound. |
| `NOTICE` | — | The notices of the licenses. |

| ID | Rule |
|---|---|
| `module.manifest` | The folder of a module MUST hold manifest.yaml. |
| `module.layout` | Every file of a module MUST stand at a path of the layout. |
| `module.file-ids` | A file at a path with <id> MUST hold that name in its id. |
| `module.media` | A media file MUST stand at a media path and begin with its format's signature. |

## 11. The manifest

| ID | Rule |
|---|---|
| `manifest.format-version` | The manifest MUST name a format version that the reader reads. |
