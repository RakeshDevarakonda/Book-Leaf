import { query } from '../config/db';
import { Book, RoyaltySummary } from '../types/book';

function parseBookRow(row: any): Book {
  return {
    id: row.id,
    author_id: row.author_id,
    title: row.title,
    isbn: row.isbn,
    genre: row.genre,
    publication_date: row.publication_date,
    status: row.status,
    mrp: parseFloat(row.mrp),
    author_royalty_per_copy: parseFloat(row.author_royalty_per_copy),
    total_copies_sold: parseInt(row.total_copies_sold, 10),
    total_royalty_earned: parseFloat(row.total_royalty_earned),
    royalty_paid: parseFloat(row.royalty_paid),
    royalty_pending: parseFloat(row.royalty_pending),
    last_royalty_payout_date: row.last_royalty_payout_date,
    print_partner: row.print_partner,
    available_on: Array.isArray(row.available_on) ? row.available_on : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const bookRepository = {
  async findByAuthorId(authorId: string): Promise<Book[]> {
    const res = await query(
      `SELECT * FROM books WHERE author_id = $1 ORDER BY publication_date DESC`,
      [authorId]
    );
    return res.rows.map(parseBookRow);
  },

  async findById(bookId: string): Promise<Book | null> {
    const res = await query(`SELECT * FROM books WHERE id = $1`, [bookId]);
    if (!res.rows[0]) return null;
    return parseBookRow(res.rows[0]);
  },

  async findAll(): Promise<Book[]> {
    const res = await query(`SELECT * FROM books ORDER BY publication_date DESC`);
    return res.rows.map(parseBookRow);
  },

  async getRoyaltySummaryByAuthorId(authorId: string): Promise<RoyaltySummary> {
    const res = await query(
      `SELECT 
        COUNT(*)::int as total_books,
        COALESCE(SUM(total_copies_sold), 0)::int as total_copies_sold,
        COALESCE(SUM(total_royalty_earned), 0)::numeric as total_royalty_earned,
        COALESCE(SUM(royalty_paid), 0)::numeric as total_royalty_paid,
        COALESCE(SUM(royalty_pending), 0)::numeric as total_royalty_pending
       FROM books 
       WHERE author_id = $1`,
      [authorId]
    );

    const row = res.rows[0];
    return {
      totalBooks: parseInt(row.total_books, 10) || 0,
      totalCopiesSold: parseInt(row.total_copies_sold, 10) || 0,
      totalRoyaltyEarned: parseFloat(row.total_royalty_earned) || 0,
      totalRoyaltyPaid: parseFloat(row.total_royalty_paid) || 0,
      totalRoyaltyPending: parseFloat(row.total_royalty_pending) || 0,
    };
  },

  async createBook(data: Omit<Book, 'created_at' | 'updated_at'> & { createdAt?: string }): Promise<Book> {
    const now = data.createdAt || new Date().toISOString();
    const res = await query(
      `INSERT INTO books (
        id, author_id, title, isbn, genre, publication_date, status,
        mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned,
        royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on,
        created_at, updated_at
      )
      VALUES (
        COALESCE($1, gen_random_uuid()::text), $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *`,
      [
        data.id || null,
        data.author_id,
        data.title,
        data.isbn,
        data.genre,
        data.publication_date,
        data.status,
        data.mrp,
        data.author_royalty_per_copy,
        data.total_copies_sold,
        data.total_royalty_earned,
        data.royalty_paid,
        data.royalty_pending,
        data.last_royalty_payout_date || null,
        data.print_partner || null,
        data.available_on || [],
        now,
        now,
      ]
    );
    return parseBookRow(res.rows[0]);
  }
};
