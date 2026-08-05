type LocalizedFieldValue = string | null | undefined;

type LocalizedRecord = {
  title_en?: LocalizedFieldValue;
  title_zh?: LocalizedFieldValue;
};

const clean = (value: LocalizedFieldValue) => String(value || '').trim();

function pick(values: LocalizedFieldValue[]) {
  for (const value of values) {
    const next = clean(value);
    if (next) return next;
  }
  return '';
}

export function resolveTitle(data: LocalizedRecord, preferred: 'en' | 'zh' | 'zhHans' | 'zhHant' = 'zhHans') {
  if (preferred === 'en') {
    return pick([data.title_en, data.title_zh]);
  }
  return pick([data.title_zh, data.title_en]);
}
