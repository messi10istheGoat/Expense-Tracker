export type TxType = "income" | "expense";

export type ExpenseCategoryId = string;
export type IncomeCategoryId = string;
export type CategoryId = string;
export type AccountId = string;

export type TxStatus = "cleared" | "pending";

export interface Transaction {
  id: string;
  date: Date;
  merchant: string;
  category: CategoryId;
  account: AccountId;
  type: TxType;
  /** Always positive — the sign is implied by `type`. */
  amount: number;
  status: TxStatus;
  recurring: boolean;
  note?: string;
}

export interface Dataset {
  transactions: Transaction[];
  start: Date;
  end: Date;
}

export type Granularity = "day" | "week" | "month";

/** Inclusive day range — both dates are local midnight. */
export interface DateRange {
  from: Date;
  to: Date;
}

export type RangePreset = "7d" | "30d" | "90d" | "6m" | "ytd" | "12m" | "all" | "custom";

export type TypeFilter = "all" | TxType;

export interface Filters {
  preset: RangePreset;
  range: DateRange;
  type: TypeFilter;
  accounts: AccountId[];
  categories: CategoryId[];
}

/** Which money flows are visible under the current filters. */
export type ViewMode = "overview" | "spending" | "income";

export interface SeriesPoint {
  key: string;
  start: Date;
  end: Date;
  label: string;
  rangeLabel: string;
  days: number;
  income: number;
  expenses: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  maxIncome: number;
  maxExpense: number;
  cat: Partial<Record<CategoryId, number>>;
}

export interface Slice {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  count: number;
  categoryId?: CategoryId;
}
