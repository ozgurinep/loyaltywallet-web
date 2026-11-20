export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  joinedAt: string; // ISO date (YYYY-MM-DD)
}
