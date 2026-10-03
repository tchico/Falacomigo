/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from './testDb';
import { DEFAULT_PROFILES, Store, type TurnRecord } from './store';

async function freshStore() {
  const db = memoryDb();
  const store = new Store(db, () => 1_000);
  await store.init();
  return { db, store };
}

const turn = (over: Partial<TurnRecord> = {}): TurnRecord => ({
  childId: 'child1', unitId: 'unit-01', sceneId: 'S1.1', beatId: 'b1', phraseId: 'P01',
  startRung: 3, outcome: 'success', day: '2026-10-01', coins: 10, ...over,
});

test('store: a fresh install has the placeholder children', async () => {
  const { store } = await freshStore();
  assert.deepEqual(await store.listProfiles(), DEFAULT_PROFILES);
});

test('store: init can run again without losing anything', async () => {
  const { db, store } = await freshStore();
  await store.recordTurn(turn());
  const again = new Store(db);
  await again.init();
  assert.equal((await again.listProfiles()).length, 2);
  assert.equal(await again.getCoins('child1'), 10);
});

test('store: profiles can be renamed and keep their order', async () => {
  const { store } = await freshStore();
  await store.saveProfile({ ...DEFAULT_PROFILES[1], name: 'Rui', avatar: 'owl' });
  const ps = await store.listProfiles();
  assert.deepEqual(ps.map((p) => p.name), ['Ana', 'Rui']);
  assert.equal(ps[1].avatar, 'owl');
});

test('store: each turn is saved at once, with progress, turn log and coins (NFR-08)', async () => {
  const { store } = await freshStore();
  const p = await store.recordTurn(turn());
  assert.equal(p.rung, 3);
  assert.equal(p.nextReview, '2026-10-02');
  assert.deepEqual((await store.getProgress('child1')).P01, p);
  assert.equal(await store.getCoins('child1'), 10);
  assert.equal(await store.lastPlayedDay('child1'), '2026-10-01');
});

test('store: each child keeps their own progress and coins (FR-01)', async () => {
  const { store } = await freshStore();
  await store.recordTurn(turn({ day: '2026-10-01' }));
  await store.recordTurn(turn({ day: '2026-10-02' }));
  assert.equal((await store.getProgress('child1')).P01.rung, 4);
  assert.deepEqual(await store.getProgress('child2'), {});
  assert.equal(await store.getCoins('child2'), 0);
  assert.equal(await store.lastPlayedDay('child2'), null);
});

test('store: turns per day are counted for the parent zone', async () => {
  const { store } = await freshStore();
  await store.recordTurn(turn({ day: '2026-10-01' }));
  await store.recordTurn(turn({ day: '2026-10-01', phraseId: 'P02' }));
  await store.recordTurn(turn({ day: '2026-10-03' }));
  assert.deepEqual(await store.turnsPerDay('child1', '2026-10-01'), [
    { day: '2026-10-01', turns: 2 },
    { day: '2026-10-03', turns: 1 },
  ]);
});

test('store: missions wait for Dad, and stars pay out once (FR-18, FR-20)', async () => {
  const { store } = await freshStore();
  const m = await store.createMission('child1', 'unit-01', 'M1');
  await store.createMission('child2', 'unit-01', 'M1');
  assert.equal((await store.openMissions()).length, 2);
  assert.deepEqual((await store.openMissions('child1')).map((x) => x.missionId), ['M1']);

  await store.approveMission(m.id, 3, 60);
  await store.approveMission(m.id, 3, 60);
  assert.equal(await store.getCoins('child1'), 60);
  assert.equal((await store.openMissions('child1')).length, 0);
  assert.equal((await store.getMission(m.id))?.stars, 3);
  assert.equal((await store.missionsGiven('child1', 'unit-01')).length, 1);
});

test('store: finished scenes are counted per child', async () => {
  const { store } = await freshStore();
  await store.finishScene('child1', 'unit-01', 'S1.1', '2026-10-01');
  await store.finishScene('child1', 'unit-01', 'S1.1', '2026-10-04');
  assert.deepEqual(await store.scenesPlayed('child1'), [{ unitId: 'unit-01', sceneId: 'S1.1', times: 2, lastAt: 1_000 }]);
  assert.deepEqual(await store.scenesPlayed('child2'), []);
});

test('store: buying in the shop takes the coins once, and only if there are enough (FR-22)', async () => {
  const { store } = await freshStore();
  await store.recordTurn(turn({ coins: 50 }));
  assert.equal(await store.buyItem('child1', 'hat-blue', 80), false, 'not enough coins');
  assert.equal(await store.getCoins('child1'), 50);
  assert.equal(await store.buyItem('child1', 'bow', 40), true);
  assert.equal(await store.getCoins('child1'), 10);
  assert.equal(await store.buyItem('child1', 'bow', 0), false, 'already owned');
  assert.deepEqual(await store.ownedItems('child1'), ['bow']);
  assert.deepEqual(await store.ownedItems('child2'), []);
});

test('store: Gui wears one item per slot, per child', async () => {
  const { store } = await freshStore();
  await store.setOutfit('child1', 'head', 'hat-blue');
  await store.setOutfit('child1', 'head', 'crown');
  await store.setOutfit('child1', 'eyes', 'sunglasses');
  assert.deepEqual(await store.getOutfit('child1'), { head: 'crown', eyes: 'sunglasses' });
  await store.setOutfit('child1', 'eyes', null);
  assert.deepEqual(await store.getOutfit('child1'), { head: 'crown' });
  assert.deepEqual(await store.getOutfit('child2'), {});
});

test('store: settings start unset, and can be changed', async () => {
  const { store } = await freshStore();
  assert.equal(await store.getSetting('smart-replies'), null);
  await store.setSetting('smart-replies', 'on');
  await store.setSetting('smart-replies', 'off');
  assert.equal(await store.getSetting('smart-replies'), 'off');
});

test('store: coins can be added outside a turn (FR-11)', async () => {
  const { store } = await freshStore();
  await store.addCoins('child1', 10);
  await store.addCoins('child1', 10);
  assert.equal(await store.getCoins('child1'), 20);
  assert.equal(await store.getCoins('child2'), 0);
});
