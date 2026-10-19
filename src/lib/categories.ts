import {
  Briefcase,
  Car,
  Clapperboard,
  CreditCard,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AccountId, CategoryId, ExpenseCategoryId, IncomeCategoryId, TxType } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  type: TxType;
  color: string;
  icon: LucideIcon;
  group?: "essentials" | "lifestyle";
  /** Monthly budget in USD (expenses only). */
  budget?: number;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  housing: { id: "housing", label: "Housing", type: "expense", color: "#6366f1", icon: House, group: "essentials", budget: 1800 },
  groceries: { id: "groceries", label: "Groceries", type: "expense", color: "#22c55e", icon: ShoppingCart, group: "essentials", budget: 600 },
  dining: { id: "dining", label: "Dining Out", type: "expense", color: "#f97316", icon: UtensilsCrossed, group: "lifestyle", budget: 500 },
  transport: { id: "transport", label: "Transport", type: "expense", color: "#0ea5e9", icon: Car, group: "essentials", budget: 420 },
  utilities: { id: "utilities", label: "Utilities", type: "expense", color: "#eab308", icon: Zap, group: "essentials", budget: 300 },
  shopping: { id: "shopping", label: "Shopping", type: "expense", color: "#ec4899", icon: ShoppingBag, group: "lifestyle", budget: 350 },
  entertainment: { id: "entertainment", label: "Entertainment", type: "expense", color: "#a855f7", icon: Clapperboard, group: "lifestyle", budget: 180 },
  health: { id: "health", label: "Health & Fitness", type: "expense", color: "#14b8a6", icon: HeartPulse, group: "essentials", budget: 150 },
  travel: { id: "travel", label: "Travel", type: "expense", color: "#f43f5e", icon: Plane, group: "lifestyle", budget: 300 },
  salary: { id: "salary", label: "Salary", type: "income", color: "#10b981", icon: Briefcase },
  freelance: { id: "freelance", label: "Freelance", type: "income", color: "#3b82f6", icon: Laptop },
  investments: { id: "investments", label: "Investments", type: "income", color: "#8b5cf6", icon: TrendingUp },
  refunds: { id: "refunds", label: "Refunds & Other", type: "income", color: "#f59e0b", icon: RotateCcw },
};

export const EXPENSE_CATEGORIES: ExpenseCategoryId[] = [
  "housing",
  "groceries",
  "dining",
  "transport",
  "utilities",
  "shopping",
  "entertainment",
  "health",
  "travel",
];

export const INCOME_CATEGORIES: IncomeCategoryId[] = ["salary", "freelance", "investments", "refunds"];

export const ESSENTIALS = EXPENSE_CATEGORIES.filter((c) => CATEGORIES[c].group === "essentials");
export const LIFESTYLE = EXPENSE_CATEGORIES.filter((c) => CATEGORIES[c].group === "lifestyle");

export interface AccountMeta {
  id: AccountId;
  label: string;
  mask?: string;
  color: string;
  icon: LucideIcon;
}

export const ACCOUNTS: Record<AccountId, AccountMeta> = {
  checking: { id: "checking", label: "Everyday Checking", mask: "•• 4821", color: "#6366f1", icon: Landmark },
  credit: { id: "credit", label: "Rewards Visa", mask: "•• 9034", color: "#f43f5e", icon: CreditCard },
  savings: { id: "savings", label: "High-Yield Savings", mask: "•• 1177", color: "#10b981", icon: PiggyBank },
  cash: { id: "cash", label: "Cash Wallet", color: "#f59e0b", icon: Wallet },
};

export const ACCOUNT_IDS: AccountId[] = ["checking", "credit", "savings", "cash"];

export const SERIES_COLORS = {
  income: "#10b981",
  expenses: "#f43f5e",
  net: "#6366f1",
  netDark: "#818cf8",
} as const;
