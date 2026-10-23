import { BookStatusType } from '../config/constants';

export interface Book {
  id: string;
  author_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string;
  status: BookStatusType;
  mrp: number;
  author_royalty_per_copy: number;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date?: string | null;
  print_partner?: string | null;
  available_on: string[];
  created_at: string;
  updated_at: string;
}

export interface RoyaltySummary {
  totalBooks: number;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPaid: number;
  totalRoyaltyPending: number;
}

export interface AuthorBooksResponse {
  books: Book[];
  summary: RoyaltySummary;
}
