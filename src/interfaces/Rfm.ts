export type SegmentName =
  | 'Champions'
  | 'Loyal'
  | 'Potential'
  | 'NeedAttention'
  | 'AtRisk'
  | 'Lost';

export interface RfmResult {
  customerId: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: 1 | 2 | 3 | 4 | 5;
  fScore: 1 | 2 | 3 | 4 | 5;
  mScore: 1 | 2 | 3 | 4 | 5;
  segment: SegmentName;
}
