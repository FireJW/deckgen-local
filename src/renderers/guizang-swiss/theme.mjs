const normalizeHint = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/_/g, '-');

const BASE = {
  paper: '#fafaf8',
  paperRgb: '250,250,248',
  ink: '#0a0a0a',
  inkRgb: '10,10,10',
  grey1: '#f0f0ee',
  grey2: '#d4d4d2',
  grey3: '#737373'
};

const SWISS_THEMES = {
  'swiss-ikb': { accent: '#002FA7', accentRgb: '0,47,167', accentOn: '#ffffff' },
  'swiss-lemon': { accent: '#FFD500', accentRgb: '255,213,0', accentOn: '#0a0a0a' },
  'swiss-green': { accent: '#C5E803', accentRgb: '197,232,3', accentOn: '#0a0a0a' },
  'swiss-orange': { accent: '#FF6B35', accentRgb: '255,107,53', accentOn: '#ffffff' }
};

export function isSwissRendererHint(value) {
  return normalizeHint(value).startsWith('swiss-');
}

export function resolveSwissTheme(value) {
  const normalized = normalizeHint(value);
  const key = SWISS_THEMES[normalized] ? normalized : 'swiss-ikb';
  return {
    key,
    ...BASE,
    ...SWISS_THEMES[key]
  };
}
