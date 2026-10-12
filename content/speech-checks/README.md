# Speech checks (NFR-11)

Reports from the speech check in the parent zone (Speech → Does the game hear them? → Report for Claude), one JSON
file per child and check, e.g. `ana-2026-10-12.json`. Each holds what the child was asked to say and what the speech
service heard, as words only; no audio is ever kept (NFR-05).

`app/src/parent/speechCheck.test.ts` judges every report here again with the current accepted answers and fails if
more than 1 in 5 of a child's right answers would be missed, listing the ones that were. When it fails, add what the
recogniser heard to the phrase's `accept` (normalised) or its `keywords`. Fix the content, never the report.
