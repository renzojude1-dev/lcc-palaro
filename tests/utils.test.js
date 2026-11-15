import test from 'node:test';
import assert from 'node:assert/strict';
import { roundRobin, singleElimination, slugify, groupBy } from '../src/lib/utils.js';

test('round robin produces every unique pair exactly once', () => {
  const teams = ['A', 'B', 'C', 'D', 'E'];
  const rounds = roundRobin(teams);
  const matches = rounds.flat();
  assert.equal(matches.length, 10);
  const pairs = matches.map(({ home, away }) => [home, away].sort().join('-'));
  assert.equal(new Set(pairs).size, 10);
  assert.ok(matches.every(({ home, away }) => home !== away));
});

test('round robin handles fewer than two teams', () => {
  assert.deepEqual(roundRobin([]), []);
  assert.deepEqual(roundRobin(['A']), []);
});

test('single elimination preview creates enough slots for odd team counts', () => {
  const rounds = singleElimination(['A', 'B', 'C']);
  assert.equal(rounds[0].length, 2);
  assert.equal(rounds[0].filter(match => match.bye).length, 1);
  assert.equal(rounds[1].length, 1);
});

test('slugify and groupBy provide stable basic helpers', () => {
  assert.equal(slugify('LCC Palaro 2026!'), 'lcc-palaro-2026');
  assert.deepEqual(groupBy([{ k: 'a' }, { k: 'b' }, { k: 'a' }], 'k'), {
    a: [{ k: 'a' }, { k: 'a' }], b: [{ k: 'b' }]
  });
});
