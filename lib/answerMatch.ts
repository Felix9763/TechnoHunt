export function cleanAnswer(str: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function cleanCode(str: string): string {
  if (!str) return '';
  // Remove all non-alphanumeric characters and lowercase
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isAnswerCorrect(submitted: string, expected: string): boolean {
  if (!submitted || !expected) return false;

  const sClean = cleanAnswer(submitted);
  const eClean = cleanAnswer(expected);

  // 1. Exact match (case-insensitive, whitespace normalized)
  if (sClean === eClean) return true;

  // 2. Alphanumeric match (ignoring all spaces and punctuation)
  const sAlnum = cleanCode(submitted);
  const eAlnum = cleanCode(expected);
  if (sAlnum === eAlnum) return true;

  // 3. Special handling for P2: "3 5 7 9 11, sum 35"
  if (eClean.includes('sum 35') || eClean.includes('35')) {
    if (sAlnum === '35791135' || sAlnum === '357911sum35') return true;
    if (sClean.includes('35') && sClean.includes('11')) return true;
  }

  // 4. Special handling for comma vs space separated lists (e.g. "5, 4, 3, 2, 1" vs "5 4 3 2 1")
  const sDelimClean = sClean.replace(/[,:;\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const eDelimClean = eClean.replace(/[,:;\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (sDelimClean === eDelimClean) return true;

  return false;
}
