// Standard advantage scoring for the clearly labelled website demo.
export function newScore() {
  return { points: [0, 0], games: [0, 0] };
}

export function addPoint(score, team) {
  if (team !== 0 && team !== 1) throw new RangeError('Unknown team');
  const next = { points: [...score.points], games: [...score.games] };
  next.points[team] += 1;
  if (next.points[team] >= 4 && next.points[team] - next.points[1 - team] >= 2) {
    next.games[team] += 1;
    next.points = [0, 0];
  }
  return next;
}

export function pointLabels(score) {
  const [us, them] = score.points;
  if (us >= 3 && them >= 3) {
    if (us === them) return ['40', '40'];
    return us > them ? ['AD', '40'] : ['40', 'AD'];
  }
  return score.points.map(point => ['0', '15', '30', '40'][point]);
}
