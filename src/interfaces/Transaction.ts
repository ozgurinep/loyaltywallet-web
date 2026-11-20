export interface Transaction {
  id: string;
  customerId: string;
  categoryId: string;
  date: string;    // ISO date (YYYY-MM-DD)
  amount: number;  // TL, > 0
}
