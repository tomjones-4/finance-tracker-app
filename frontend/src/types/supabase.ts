export interface Transaction {
  id: string; // UUID, primary key
  user_id: string; // UUID, references users
  account_id: string; // UUID, references accounts
  transaction_id: string; // Plaid's transaction_id or custom for manual
  source: "plaid" | "venmo" | "manual";
  name: string;
  amount: number;
  date: string; // ISO date
  iso_currency_code?: string | null;
  pending?: boolean;
  category?: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface PlaidItem {
  id: string; // UUID, primary key
  user_id: string; // UUID, references users
  item_id: string; // Plaid's item_id
  access_token: string;
  institution_id?: string | null;
  institution_name?: string | null;
  status?: string | null;
  transactions_cursor?: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Account {
  id: string; // UUID, primary key
  user_id: string; // UUID, references users
  plaid_item_id: string; // UUID, references plaid_items
  account_id: string; // Plaid's account_id
  name: string;
  official_name?: string | null;
  subtype?: string | null;
  type?: string | null;
  current_balance?: number | null;
  available_balance?: number | null;
  iso_currency_code?: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Category {
  id: string; // UUID, primary key
  user_id: string; // UUID, references users
  name: string;
  parent_id?: string | null; // For subcategories
  created_at: string;
  updated_at: string;
}

export interface VenmoToken {
  id: string; // UUID, primary key
  user_id: string; // UUID, references users
  access_token: string;
  created_at: string;
  updated_at: string;
}
