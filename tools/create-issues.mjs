#!/usr/bin/env node
// Creates the labels, milestones and issues in tools/issues.json on GitHub.
// Safe to run more than once: anything that already exists (matched by name or title) is skipped.
//
// Easiest way: GitHub → Actions → "Create issues from requirements" → Run workflow.
// Locally:     GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node tools/create-issues.mjs [--dry-run]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { milestones, labels, issues } = JSON.parse(readFileSync(join(root, 'tools', 'issues.json'), 'utf8'));

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const dryRun = process.argv.includes('--dry-run');
if (!dryRun && (!token || !repo)) {
  console.error('Set GITHUB_TOKEN and GITHUB_REPOSITORY (owner/repo), or pass --dry-run.');
  process.exit(1);
}

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const batch = await gh('GET', `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

if (dryRun) {
  console.log(`Would create ${labels.length} labels, ${milestones.length} milestones and ${issues.length} issues:`);
  for (const i of issues) console.log(`  [${i.milestone}] ${i.title}`);
  process.exit(0);
}

const existingLabels = new Set((await all('/labels')).map((l) => l.name));
for (const l of labels) {
  if (existingLabels.has(l.name)) continue;
  await gh('POST', '/labels', l);
  console.log(`label: ${l.name}`);
}

const existingMilestones = new Map((await all('/milestones?state=all')).map((m) => [m.title, m.number]));
for (const m of milestones) {
  if (existingMilestones.has(m.title)) continue;
  const created = await gh('POST', '/milestones', m);
  existingMilestones.set(m.title, created.number);
  console.log(`milestone: ${m.title}`);
}

const existingIssues = new Set((await all('/issues?state=all')).map((i) => i.title.split(' · ')[0]));
let created = 0;
for (const i of issues) {
  if (existingIssues.has(i.id)) continue;
  await gh('POST', '/issues', { title: i.title, body: i.body, labels: i.labels, milestone: existingMilestones.get(i.milestone) });
  created++;
  console.log(`issue: ${i.title}`);
  await new Promise((r) => setTimeout(r, 1000)); // stay well under GitHub's secondary rate limits
}
console.log(`Done. Created ${created} issues, skipped ${issues.length - created} that already existed.`);
