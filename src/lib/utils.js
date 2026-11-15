
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function groupBy(items = [], key) {
  return items.reduce((accumulator, item) => {
    const groupKey =
      typeof key === 'function' ? key(item) : item[key];

    (accumulator[groupKey] ??= []).push(item);

    return accumulator;
  }, {});
}

export function roundRobin(teams = []) {
  const list = [...teams];

  if (list.length < 2) return [];

  if (list.length % 2 !== 0) {
    list.push(null);
  }

  const count = list.length;
  const rounds = [];

  for (let round = 0; round < count - 1; round++) {
    const games = [];

    for (let index = 0; index < count / 2; index++) {
      const home = list[index];
      const away = list[count - 1 - index];

      if (home && away) {
        games.push({
          home,
          away,
          round: round + 1,
        });
      }
    }

    rounds.push(games);

    // Keep the first team fixed and rotate the remaining teams.
    list.splice(1, 0, list.pop());
  }

  return rounds;
}

export function singleElimination(teams = []) {
  if (teams.length === 0) return [];

  const size = 2 ** Math.ceil(
    Math.log2(Math.max(2, teams.length))
  );

  const slots = [...teams];

  while (slots.length < size) {
    slots.push(null);
  }

  const rounds = [];
  let current = slots;
  let round = 1;

  while (current.length > 1) {
    const matches = [];

    for (let index = 0; index < current.length; index += 2) {
      const home = current[index];
      const away = current[index + 1];

      matches.push({
        round,
        home,
        away,
        bye: !home || !away,
      });
    }

    rounds.push(matches);

    // Future-round participants are placeholders until winners advance.
    current = Array.from(
      { length: current.length / 2 },
      () => null
    );

    round++;
  }

  return rounds;
}
