export const splitMarkdownTableRow = (line) => {
  const source = String(line ?? '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '');
  const cells = [];
  let cell = '';
  let escaped = false;

  for (const character of source) {
    if (escaped) {
      cell += character === '|' ? '|' : `\\${character}`;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '|') {
      cells.push(cell.trim());
      cell = '';
      continue;
    }

    cell += character;
  }

  if (escaped) {
    cell += '\\';
  }

  cells.push(cell.trim());
  return cells;
};
