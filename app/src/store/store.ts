// The local store: profiles, per-phrase progress, coins, the turn log and missions (FR-01, FR-13, NFR-08).
// Everything lives on the tablet. No audio is ever written here (NFR-05): only what was practised and how it went.

import type { AgeBand, ChildProfile } from '../content/types';
import { newProgress, record, type Outcome, type PhraseProgress } from '../engine/ladder';
import { ageWord } from '../engine/template';
import type { SqlDb, SqlValue } from './db';

export interface StoredProfile {
  id: string;
  name: string;
  age: AgeBand;
  /** Key into ui/avatars.ts. */
  avatar: string;
  /** How they'd name a sibling, e.g. "irmão" or the sibling's name. */
  sibling: string;
}

export const toChildProfile = (p: StoredProfile): ChildProfile => ({
  id: p.id,
  name: p.name,
  age: p.age,
  ageWord: ageWord(p.age),
  sibling: p.sibling,
});

/** Placeholder children for a fresh install. The parent zone renames them. */
export const DEFAULT_PROFILES: StoredProfile[] = [
  { id: 'child1', name: 'Ana', age: 8, avatar: 'fox', sibling: 'irmão' },
  { id: 'child2', name: 'Tomás', age: 6, avatar: 'octopus', sibling: 'irmã' },
];

export interface TurnRecord {
  childId: string;
  unitId: string;
  sceneId: string;
  beatId: string;
  phraseId: string;
  /** Used when this is the child's first time with the phrase. */
  startRung: number;
  outcome: Outcome;
  /** YYYY-MM-DD, the child's local day. */
  day: string;
  coins: number;
}

export interface ScenePlay {
  unitId: string;
  sceneId: string;
  times: number;
  lastAt: number;
}

export interface MissionRow {
  id: number;
  childId: string;
  unitId: string;
  missionId: string;
  createdAt: number;
  stars: number | null;
  approvedAt: number | null;
}

// Each entry moves the schema up one version. Only ever append.
const MIGRATIONS: string[] = [
  `CREATE TABLE profiles (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     age INTEGER NOT NULL,
     avatar TEXT NOT NULL,
     sibling TEXT NOT NULL,
     coins INTEGER NOT NULL DEFAULT 0,
     sort INTEGER NOT NULL DEFAULT 0
   );
   CREATE TABLE progress (
     child_id TEXT NOT NULL,
     phrase_id TEXT NOT NULL,
     rung INTEGER NOT NULL,
     successes INTEGER NOT NULL,
     failures INTEGER NOT NULL,
     fail_streak INTEGER NOT NULL,
     success_days TEXT NOT NULL,
     review_step INTEGER NOT NULL,
     last_seen TEXT,
     next_review TEXT,
     PRIMARY KEY (child_id, phrase_id)
   );
   CREATE TABLE turns (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     child_id TEXT NOT NULL,
     unit_id TEXT NOT NULL,
     scene_id TEXT NOT NULL,
     beat_id TEXT NOT NULL,
     phrase_id TEXT NOT NULL,
     outcome TEXT NOT NULL,
     day TEXT NOT NULL,
     at INTEGER NOT NULL
   );
   CREATE INDEX turns_child_day ON turns (child_id, day);
   CREATE TABLE missions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     child_id TEXT NOT NULL,
     unit_id TEXT NOT NULL,
     mission_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     stars INTEGER,
     approved_at INTEGER
   );
   CREATE TABLE scene_plays (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     child_id TEXT NOT NULL,
     unit_id TEXT NOT NULL,
     scene_id TEXT NOT NULL,
     day TEXT NOT NULL,
     at INTEGER NOT NULL
   );`,
  // Gui's shop (FR-22): what each child has bought, and what Gui is wearing for them.
  `CREATE TABLE shop_items (
     child_id TEXT NOT NULL,
     item_id TEXT NOT NULL,
     bought_at INTEGER NOT NULL,
     PRIMARY KEY (child_id, item_id)
   );
   CREATE TABLE outfit (
     child_id TEXT NOT NULL,
     slot TEXT NOT NULL,
     item_id TEXT NOT NULL,
     PRIMARY KEY (child_id, slot)
   );`,
  // Family settings chosen in the parent zone, e.g. Gui's smart replies.
  `CREATE TABLE settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
];

interface ProgressRow {
  phrase_id: string;
  rung: number;
  successes: number;
  failures: number;
  fail_streak: number;
  success_days: string;
  review_step: number;
  last_seen: string | null;
  next_review: string | null;
}

const fromRow = (r: ProgressRow): PhraseProgress => ({
  phraseId: r.phrase_id,
  rung: r.rung as PhraseProgress['rung'],
  successes: r.successes,
  failures: r.failures,
  failStreak: r.fail_streak,
  successDays: JSON.parse(r.success_days) as string[],
  reviewStep: r.review_step,
  lastSeen: r.last_seen,
  nextReview: r.next_review,
});

/** Setting key for Gui's smart replies: 'on' or 'off' (off when unset). */
export const SMART_REPLIES = 'smart-replies';

export class Store {
  constructor(private readonly db: SqlDb, private readonly now: () => number = Date.now) {}

  /** Creates or upgrades the tables, and adds the placeholder children on a fresh install. */
  async init(): Promise<void> {
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
    const version = row?.user_version ?? 0;
    for (let v = version; v < MIGRATIONS.length; v++) {
      await this.db.withTransactionAsync(async () => {
        await this.db.execAsync(MIGRATIONS[v]);
        await this.db.execAsync(`PRAGMA user_version = ${v + 1}`);
      });
    }
    const count = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM profiles', []);
    if (!count?.n) for (const [i, p] of DEFAULT_PROFILES.entries()) await this.saveProfile(p, i);
  }

  // Profiles (FR-01)

  async listProfiles(): Promise<StoredProfile[]> {
    return this.db.getAllAsync<StoredProfile>('SELECT id, name, age, avatar, sibling FROM profiles ORDER BY sort, id', []);
  }

  async saveProfile(p: StoredProfile, sort = 0): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO profiles (id, name, age, avatar, sibling, sort) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, age = excluded.age, avatar = excluded.avatar, sibling = excluded.sibling`,
      [p.id, p.name, p.age, p.avatar, p.sibling, sort],
    );
  }

  // Progress (FR-13, FR-14)

  async getProgress(childId: string): Promise<Record<string, PhraseProgress>> {
    const rows = await this.db.getAllAsync<ProgressRow>('SELECT * FROM progress WHERE child_id = ?', [childId]);
    return Object.fromEntries(rows.map((r) => [r.phrase_id, fromRow(r)]));
  }

  private async getPhraseProgress(childId: string, phraseId: string): Promise<PhraseProgress | null> {
    const r = await this.db.getFirstAsync<ProgressRow>('SELECT * FROM progress WHERE child_id = ? AND phrase_id = ?', [childId, phraseId]);
    return r ? fromRow(r) : null;
  }

  private async putProgress(childId: string, p: PhraseProgress): Promise<void> {
    const values: SqlValue[] = [
      childId, p.phraseId, p.rung, p.successes, p.failures, p.failStreak,
      JSON.stringify(p.successDays), p.reviewStep, p.lastSeen, p.nextReview,
    ];
    await this.db.runAsync(
      `INSERT OR REPLACE INTO progress
         (child_id, phrase_id, rung, successes, failures, fail_streak, success_days, review_step, last_seen, next_review)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values,
    );
  }

  /**
   * Saves one spoken turn straight away, so closing the app never loses more than the current turn (NFR-08):
   * the turn log, the phrase's ladder progress and the coins, in one transaction.
   */
  async recordTurn(t: TurnRecord): Promise<PhraseProgress> {
    let updated!: PhraseProgress;
    await this.db.withTransactionAsync(async () => {
      const current = (await this.getPhraseProgress(t.childId, t.phraseId)) ?? newProgress(t.phraseId, t.startRung);
      updated = record(current, t.outcome, t.day);
      await this.putProgress(t.childId, updated);
      await this.db.runAsync(
        'INSERT INTO turns (child_id, unit_id, scene_id, beat_id, phrase_id, outcome, day, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [t.childId, t.unitId, t.sceneId, t.beatId, t.phraseId, t.outcome, t.day, this.now()],
      );
      if (t.coins) await this.addCoinsInTx(t.childId, t.coins);
    });
    return updated;
  }

  /** The day of the child's most recent spoken turn, or null if they've never played. */
  async lastPlayedDay(childId: string): Promise<string | null> {
    const r = await this.db.getFirstAsync<{ day: string | null }>('SELECT MAX(day) AS day FROM turns WHERE child_id = ?', [childId]);
    return r?.day ?? null;
  }

  /** Spoken turns per day, for the parent zone. */
  async turnsPerDay(childId: string, fromDay: string): Promise<{ day: string; turns: number }[]> {
    return this.db.getAllAsync('SELECT day, COUNT(*) AS turns FROM turns WHERE child_id = ? AND day >= ? GROUP BY day ORDER BY day', [childId, fromDay]);
  }

  /** Marks a scene as played to the end, so the next episode moves on. */
  async finishScene(childId: string, unitId: string, sceneId: string, day: string): Promise<void> {
    await this.db.runAsync('INSERT INTO scene_plays (child_id, unit_id, scene_id, day, at) VALUES (?, ?, ?, ?, ?)', [childId, unitId, sceneId, day, this.now()]);
  }

  /** Every scene this child has finished, with how often and when they last finished it. */
  async scenesPlayed(childId: string): Promise<ScenePlay[]> {
    return this.db.getAllAsync<ScenePlay>(
      `SELECT unit_id AS unitId, scene_id AS sceneId, COUNT(*) AS times, MAX(at) AS lastAt
       FROM scene_plays WHERE child_id = ? GROUP BY unit_id, scene_id`,
      [childId],
    );
  }

  // Coins (FR-20)

  // Settings (parent zone)

  async getSetting(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }

  async getCoins(childId: string): Promise<number> {
    const r = await this.db.getFirstAsync<{ coins: number }>('SELECT coins FROM profiles WHERE id = ?', [childId]);
    return r?.coins ?? 0;
  }

  /** Coins earned outside a phrase turn, e.g. a word from "Como se diz?" said back (FR-11). */
  async addCoins(childId: string, n: number): Promise<void> {
    await this.addCoinsInTx(childId, n);
  }

  private async addCoinsInTx(childId: string, n: number): Promise<void> {
    await this.db.runAsync('UPDATE profiles SET coins = coins + ? WHERE id = ?', [n, childId]);
  }

  // Gui's shop (FR-22)

  async ownedItems(childId: string): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ item_id: string }>('SELECT item_id FROM shop_items WHERE child_id = ? ORDER BY bought_at', [childId]);
    return rows.map((r) => r.item_id);
  }

  /**
   * Buys an item if the child can afford it and doesn't have it yet: takes the coins and records it, together.
   * Returns false (and changes nothing) otherwise.
   */
  async buyItem(childId: string, itemId: string, price: number): Promise<boolean> {
    let bought = false;
    await this.db.withTransactionAsync(async () => {
      const owned = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM shop_items WHERE child_id = ? AND item_id = ?', [childId, itemId]);
      if (owned?.n) return;
      if ((await this.getCoins(childId)) < price) return;
      await this.db.runAsync('UPDATE profiles SET coins = coins - ? WHERE id = ?', [price, childId]);
      await this.db.runAsync('INSERT INTO shop_items (child_id, item_id, bought_at) VALUES (?, ?, ?)', [childId, itemId, this.now()]);
      bought = true;
    });
    return bought;
  }

  /** What Gui is wearing for this child, by slot (e.g. { head: 'hat-blue' }). */
  async getOutfit(childId: string): Promise<Record<string, string>> {
    const rows = await this.db.getAllAsync<{ slot: string; item_id: string }>('SELECT slot, item_id FROM outfit WHERE child_id = ?', [childId]);
    return Object.fromEntries(rows.map((r) => [r.slot, r.item_id]));
  }

  /** Puts an item on Gui in its slot, or takes the slot off with null. */
  async setOutfit(childId: string, slot: string, itemId: string | null): Promise<void> {
    if (itemId === null) await this.db.runAsync('DELETE FROM outfit WHERE child_id = ? AND slot = ?', [childId, slot]);
    else await this.db.runAsync('INSERT OR REPLACE INTO outfit (child_id, slot, item_id) VALUES (?, ?, ?)', [childId, slot, itemId]);
  }

  // Missions to Dad (FR-17, FR-18)

  async createMission(childId: string, unitId: string, missionId: string): Promise<MissionRow> {
    await this.db.runAsync('INSERT INTO missions (child_id, unit_id, mission_id, created_at) VALUES (?, ?, ?, ?)', [childId, unitId, missionId, this.now()]);
    const r = await this.db.getFirstAsync<{ id: number }>('SELECT MAX(id) AS id FROM missions WHERE child_id = ?', [childId]);
    return (await this.getMission(r!.id))!;
  }

  async getMission(id: number): Promise<MissionRow | null> {
    return this.db.getFirstAsync<MissionRow>(`SELECT ${MISSION_COLUMNS} FROM missions WHERE id = ?`, [id]);
  }

  /** Missions not yet approved by Dad, oldest first. `childId` narrows it to one child. */
  async openMissions(childId?: string): Promise<MissionRow[]> {
    return childId
      ? this.db.getAllAsync<MissionRow>(`SELECT ${MISSION_COLUMNS} FROM missions WHERE approved_at IS NULL AND child_id = ? ORDER BY id`, [childId])
      : this.db.getAllAsync<MissionRow>(`SELECT ${MISSION_COLUMNS} FROM missions WHERE approved_at IS NULL ORDER BY id`, []);
  }

  /** Missions this child has been given for a unit, so the next one can be picked. */
  async missionsGiven(childId: string, unitId: string): Promise<MissionRow[]> {
    return this.db.getAllAsync<MissionRow>(`SELECT ${MISSION_COLUMNS} FROM missions WHERE child_id = ? AND unit_id = ? ORDER BY id`, [childId, unitId]);
  }

  /** Dad's stars. Adds the bonus coins once; approving the same mission again does nothing. */
  async approveMission(id: number, stars: number, coins: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const m = await this.getMission(id);
      if (!m || m.approvedAt !== null) return;
      await this.db.runAsync('UPDATE missions SET stars = ?, approved_at = ? WHERE id = ?', [stars, this.now(), id]);
      await this.addCoinsInTx(m.childId, coins);
    });
  }
}

const MISSION_COLUMNS =
  'id, child_id AS childId, unit_id AS unitId, mission_id AS missionId, created_at AS createdAt, stars, approved_at AS approvedAt';
