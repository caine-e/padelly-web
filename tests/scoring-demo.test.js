import test from 'node:test';
import assert from 'node:assert/strict';
import { newScore, addPoint, pointLabels } from '../assets/scoring-demo.js';

const play = (teams, initial = newScore()) => teams.reduce(addPoint, initial);

test('standard scoring wins a game after four unanswered points', () => {
  let score = newScore();
  for (const label of ['15', '30', '40']) {
    score = addPoint(score, 0);
    assert.deepEqual(pointLabels(score), [label, '0']);
  }
  assert.deepEqual(addPoint(score, 0), { points: [0, 0], games: [1, 0] });
});

test('deuce requires two clear points and advantage can switch teams', () => {
  const deuce = play([0, 1, 0, 1, 0, 1]);
  assert.deepEqual(pointLabels(deuce), ['40', '40']);
  const advantage = addPoint(deuce, 1);
  assert.deepEqual(pointLabels(advantage), ['40', 'AD']);
  const level = addPoint(advantage, 0);
  assert.deepEqual(pointLabels(level), ['40', '40']);
  assert.deepEqual(pointLabels(addPoint(level, 0)), ['AD', '40']);
  assert.deepEqual(play([0, 0], level), { points: [0, 0], games: [1, 0] });
});

test('undo history can keep immutable states, including across a game boundary', () => {
  const beforeGame = play([1, 1, 1]);
  const afterGame = addPoint(beforeGame, 1);
  assert.deepEqual(beforeGame, { points: [0, 3], games: [0, 0] });
  assert.deepEqual(afterGame, { points: [0, 0], games: [0, 1] });
  assert.deepEqual(play([0, 0, 0, 0], afterGame).games, [1, 1]);
});
