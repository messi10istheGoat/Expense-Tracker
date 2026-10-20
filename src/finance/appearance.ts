export const STYLES = [
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Less noise. More clarity.',
    description: 'Pure black and white. Quiet surfaces, confident typography, nothing extra.',
    label: 'Clean & focused',
    colors: ['#171717', '#888888', '#eeeeee'],
  },
  {
    id: 'botanical',
    name: 'Botanical',
    tagline: 'A little room to grow.',
    description: 'The original Spendwise. Warm cream, forest greens, and a softer rhythm.',
    label: 'The original',
    colors: ['#287252', '#adc393', '#eee9dc'],
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    tagline: 'Your money. No filter.',
    description: 'Bold outlines, unapologetic type, solid shadows, and a punch of yellow.',
    label: 'Bold & expressive',
    colors: ['#f1d629', '#191919', '#f6f4e9'],
  },
  {
    id: 'neon',
    name: 'Neon',
    tagline: 'A brighter perspective.',
    description: 'Carbon black, electric lime, and sculpted cards. A fresh perspective on your money.',
    label: 'A little electric',
    colors: ['#d2ff00', '#11120e', '#eff1e9'],
  },
] as const;
export type StyleId = (typeof STYLES)[number]['id'];
export type ColorMode = 'light' | 'dark';
export type ModePreference = ColorMode | 'system';
export type TextSize = 'standard' | 'large';
export interface Appearance {
  style: StyleId;
  mode: ModePreference;
  textSize: TextSize;
}
export const APPEARANCE_KEYS = {
  style: 'spendwise-style',
  mode: 'spendwise-theme',
  textSize: 'spendwise-text-size',
} as const;
export function isStyle(value: unknown): value is StyleId {
  return STYLES.some((style) => style.id === value);
}
export function readAppearance(storage?: Pick<Storage, 'getItem'>): Appearance {
  const defaults: Appearance = { style: 'minimal', mode: 'system', textSize: 'standard' };
  try {
    const legacyMode = storage?.getItem(APPEARANCE_KEYS.mode);
    const style = storage?.getItem(APPEARANCE_KEYS.style);
    const textSize = storage?.getItem(APPEARANCE_KEYS.textSize);
    return {
      // Returning users retain the original design; fresh installs start with Minimal.
      style: isStyle(style)
        ? style
        : legacyMode === 'light' || legacyMode === 'dark'
          ? 'botanical'
          : 'minimal',
      mode: legacyMode === 'light' || legacyMode === 'dark' ? legacyMode : 'system',
      textSize: textSize === 'large' ? 'large' : 'standard',
    };
  } catch {
    return defaults;
  }
}
export const resolveMode = (preference: ModePreference, systemDark: boolean): ColorMode =>
  preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
