import { describe, expect, it } from 'vitest';
import { APPEARANCE_KEYS, isStyle, readAppearance, resolveMode, STYLES } from './appearance';
const storage = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
describe('appearance preferences', () => {
  it('starts new workspaces in Minimal and follows the device', () => {
    expect(readAppearance(storage({}))).toEqual({ style: 'minimal', mode: 'system', textSize: 'standard' });
  });
  it.each(['light', 'dark'] as const)(
    'preserves the original Botanical style for legacy %s users',
    (mode) => {
      expect(readAppearance(storage({ [APPEARANCE_KEYS.mode]: mode }))).toEqual({
        style: 'botanical',
        mode,
        textSize: 'standard',
      });
    },
  );
  it.each(STYLES.map((s) => s.id))('reads %s independently from color mode and reading size', (style) => {
    expect(
      readAppearance(
        storage({
          [APPEARANCE_KEYS.style]: style,
          [APPEARANCE_KEYS.mode]: 'dark',
          [APPEARANCE_KEYS.textSize]: 'large',
        }),
      ),
    ).toEqual({ style, mode: 'dark', textSize: 'large' });
  });
  it('keeps a selected design when following system mode', () => {
    expect(
      readAppearance(storage({ [APPEARANCE_KEYS.style]: 'neon', [APPEARANCE_KEYS.mode]: 'system' })).style,
    ).toBe('neon');
  });
  it('rejects unrecognized and prototype-style values without trusting storage', () => {
    expect(isStyle('__proto__')).toBe(false);
    expect(isStyle('NEON')).toBe(false);
    expect(
      readAppearance(
        storage({
          [APPEARANCE_KEYS.style]: '__proto__',
          [APPEARANCE_KEYS.mode]: 'invalid',
          [APPEARANCE_KEYS.textSize]: '999px',
        }),
      ),
    ).toEqual({ style: 'minimal', mode: 'system', textSize: 'standard' });
  });
  it('still renders when storage is blocked', () => {
    expect(
      readAppearance({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual(readAppearance());
  });
  it.each([
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)('resolves %s with system-dark=%s to %s', (mode, systemDark, expected) => {
    expect(resolveMode(mode, systemDark)).toBe(expected);
  });
  it('has four distinct stable IDs, including the preserved original', () => {
    expect(new Set(STYLES.map((s) => s.id)).size).toBe(4);
    expect(isStyle('botanical')).toBe(true);
  });
});
