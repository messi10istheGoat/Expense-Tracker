const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateShortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateLongFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const monthLongFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** Avoid rendering "-$0". */
const clean = (n: number) => (Math.abs(n) < 0.005 ? 0 : n);

export function fmtCurrency(n: number, decimals: 0 | 2 = 0): string {
  return (decimals === 2 ? usd2 : usd0).format(clean(n));
}

/** Uses cents for small values, whole dollars for big ones. */
export function fmtSmart(n: number): string {
  return Math.abs(n) < 1000 ? usd2.format(clean(n)) : usd0.format(clean(n));
}

export function fmtCompact(n: number): string {
  return usdCompact.format(clean(n));
}

export function fmtInt(n: number): string {
  return intFmt.format(clean(n));
}

export function fmtPercent(n: number, decimals = 1): string {
  return `${clean(n).toFixed(decimals)}%`;
}

export function fmtSigned(n: number, decimals: 0 | 2 = 2): string {
  const v = clean(n);
  const s = fmtCurrency(Math.abs(v), decimals);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export const fmtDate = (d: Date) => dateFmt.format(d);
export const fmtDateShort = (d: Date) => dateShortFmt.format(d);
export const fmtDateLong = (d: Date) => dateLongFmt.format(d);
export const fmtMonth = (d: Date) => monthFmt.format(d);
export const fmtMonthLong = (d: Date) => monthLongFmt.format(d);
export const fmtTime = (d: Date) => timeFmt.format(d);

export function fmtRange(from: Date, to: Date): string {
  if (from.getFullYear() === to.getFullYear()) {
    return `${fmtDateShort(from)} – ${fmtDateShort(to)}, ${to.getFullYear()}`;
  }
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

export function pluralize(n: number, word: string, plural = `${word}s`): string {
  return `${fmtInt(n)} ${n === 1 ? word : plural}`;
}
