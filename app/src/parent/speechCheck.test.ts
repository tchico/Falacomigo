/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { units } from '../content';
import { DEFAULT_PROFILES, toChildProfile } from '../store/store';
import { checkItems, checkSummary, judgeCheck, MISS_LIMIT, parseCheck, rejudge, reportFor, reportJson, type CheckReport, type CheckResult } from './speechCheck';

const [ana, tomas] = DEFAULT_PROFILES.map(toChildProfile);

test('speech check: every unit has phrases to check, each said once, with the child filled in', () => {
  const items = checkItems(units, ana);
  for (const u of units) assert.ok(items.some((i) => i.unitId === u.id), u.id);
  assert.equal(new Set(items.map((i) => i.say.toLowerCase())).size, items.length);
  assert.ok(items.some((i) => i.say === 'Chamo-me Ana.'));
  assert.ok(checkItems(units, tomas).some((i) => i.say === 'Chamo-me Tomás.'));
  assert.ok(items.every((i) => !/[{}]/.test(i.say)), 'no placeholders left');
});

test('speech check: the game judges what was heard the way a scene does', () => {
  const item = checkItems(units, ana).find((i) => i.say === 'Eu moro na Irlanda.')!;
  assert.equal(judgeCheck('Eu moro na Irlanda.', item, 8), 'got-it');
  assert.equal(judgeCheck('eu moro', item, 8), 'nearly');
  assert.equal(judgeCheck('banana split', item, 8), 'missed');
});

const r = (verdict: CheckResult['verdict'], i = 0): CheckResult => ({ key: `k${i}`, say: 'x', heard: 'y', verdict, at: i });

test('speech check: the aim is fewer than 1 in 5 missed, once there are enough answers', () => {
  const nine = [...Array(8)].map((_, i) => r('got-it', i)).concat(r('nearly', 8), r('missed', 9));
  assert.deepEqual(checkSummary(nine), { said: 10, gotIt: 8, nearly: 1, missed: 1, missedShare: 0.1, meetsTarget: true });
  const two = [...Array(8)].map((_, i) => r('got-it', i)).concat(r('missed', 8), r('missed', 9));
  assert.equal(checkSummary(two).meetsTarget, false, 'exactly 1 in 5 is not fewer');
  assert.equal(checkSummary([r('missed')]).meetsTarget, null);
});

test('speech check: saved results survive bad data, and a report judges again with the content', () => {
  const item = checkItems(units, ana).find((i) => i.say === 'Chamo-me Ana.')!;
  const check = { [item.key]: { key: item.key, say: item.say, heard: 'chamo me ana', verdict: 'got-it' as const, at: 5 }, bad: { key: 1 } };
  const parsed = parseCheck(JSON.stringify(check));
  assert.deepEqual(Object.keys(parsed), [item.key]);
  assert.deepEqual(parseCheck('{oops'), {});
  const report = reportFor(ana, parsed, '2026-10-05');
  assert.deepEqual(report.results, [{ key: item.key, say: 'Chamo-me Ana.', heard: 'chamo me ana' }]);
  assert.deepEqual(JSON.parse(reportJson(report)), report, 'the copied report is valid JSON');
  const again = rejudge({ ...report, results: [...report.results, { key: 'unit-01/gone/b9', say: 'x', heard: 'x' }] }, units);
  assert.equal(again.results[0].verdict, 'got-it');
  assert.deepEqual(again.gone, ['unit-01/gone/b9']);
});

// NFR-11 on real children: every check Dad saved, judged again with today's accepted answers.
const reports = join(__dirname, '..', '..', '..', 'content', 'speech-checks');
const files = existsSync(reports) ? readdirSync(reports).filter((f) => f.endsWith('.json')) : [];
for (const f of files) {
  test(`speech check: ${f} still has fewer than 1 in 5 right answers missed (NFR-11)`, () => {
    const report = JSON.parse(readFileSync(join(reports, f), 'utf8')) as CheckReport;
    const { results, gone } = rejudge(report, units);
    assert.deepEqual(gone, [], 'turns no longer in the content: save a fresh check');
    const missed = results.filter((x) => x.verdict === 'missed');
    assert.ok(missed.length / results.length < MISS_LIMIT, `missed ${missed.length} of ${results.length}:\n${missed.map((x) => `  ${x.say} → "${x.heard}"`).join('\n')}`);
  });
}
