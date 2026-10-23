import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { query, pool } from '../src/config/db';
import { runMigrations } from '../migrations/run';
import { ROLES } from '../src/config/constants';

interface SeedBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string;
  status: string;
  mrp: number;
  author_royalty_per_copy: number;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date?: string | null;
  print_partner?: string | null;
  available_on?: string[];
}

interface SeedAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: SeedBook[];
}

interface SeedData {
  authors: SeedAuthor[];
}

const DEFAULT_AUTHOR_PASSWORD = 'Author@123';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  console.log('🌱 Starting database seed process...');

  // 1. Ensure migrations are applied first
  await runMigrations();

  // 2. Locate sample JSON dataset
  const possiblePaths = [
    path.join(__dirname, '../../FULLSTACK-SAMPLEDATA (1) (1) (1).json'),
    path.join(__dirname, '../seeds/bookleaf_sample_data.json'),
    path.join(__dirname, '../../bookleaf_sample_data.json'),
  ];

  let dataFilePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dataFilePath = p;
      break;
    }
  }

  if (!dataFilePath) {
    throw new Error('❌ Sample dataset JSON file could not be found!');
  }

  console.log(`📖 Loading dataset from: ${path.basename(dataFilePath)}`);
  const rawData = fs.readFileSync(dataFilePath, 'utf-8');
  const seedData: SeedData = JSON.parse(rawData);

  // 3. Hash passwords
  const salt = await bcrypt.genSalt(10);
  const authorPasswordHash = await bcrypt.hash(DEFAULT_AUTHOR_PASSWORD, salt);
  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

  const nowIso = new Date().toISOString();

  // 4. Seed Default Admin User
  console.log('👤 Seeding Admin user...');
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, phone, city, joined_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       updated_at = EXCLUDED.updated_at`,
    [
      'ADM001',
      'BookLeaf Operations Admin',
      'admin@bookleaf.com',
      adminPasswordHash,
      ROLES.ADMIN,
      '+91-11-2345-6789',
      'Delhi',
      '2022-01-01',
      nowIso,
      nowIso,
    ]
  );

  // 5. Seed Authors and Books
  console.log(`📚 Seeding ${seedData.authors.length} authors and their books...`);

  let totalBooksSeeded = 0;

  for (const author of seedData.authors) {
    // Insert/Update Author
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, city, joined_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         city = EXCLUDED.city,
         joined_date = EXCLUDED.joined_date,
         updated_at = EXCLUDED.updated_at`,
      [
        author.author_id,
        author.name,
        author.email.toLowerCase(),
        authorPasswordHash,
        ROLES.AUTHOR,
        author.phone,
        author.city,
        author.joined_date,
        nowIso,
        nowIso,
      ]
    );

    // Insert/Update Books for this Author
    for (const book of author.books) {
      await query(
        `INSERT INTO books (
          id, author_id, title, isbn, genre, publication_date, status,
          mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned,
          royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          author_id = EXCLUDED.author_id,
          title = EXCLUDED.title,
          isbn = EXCLUDED.isbn,
          genre = EXCLUDED.genre,
          publication_date = EXCLUDED.publication_date,
          status = EXCLUDED.status,
          mrp = EXCLUDED.mrp,
          author_royalty_per_copy = EXCLUDED.author_royalty_per_copy,
          total_copies_sold = EXCLUDED.total_copies_sold,
          total_royalty_earned = EXCLUDED.total_royalty_earned,
          royalty_paid = EXCLUDED.royalty_paid,
          royalty_pending = EXCLUDED.royalty_pending,
          last_royalty_payout_date = EXCLUDED.last_royalty_payout_date,
          print_partner = EXCLUDED.print_partner,
          available_on = EXCLUDED.available_on,
          updated_at = EXCLUDED.updated_at`,
        [
          book.book_id,
          author.author_id,
          book.title,
          book.isbn,
          book.genre,
          book.publication_date,
          book.status,
          book.mrp,
          book.author_royalty_per_copy,
          book.total_copies_sold,
          book.total_royalty_earned,
          book.royalty_paid,
          book.royalty_pending,
          book.last_royalty_payout_date || null,
          book.print_partner || null,
          book.available_on || [],
          nowIso,
          nowIso,
        ]
      );
      totalBooksSeeded++;
    }
  }

  console.log('----------------------------------------------------');
  console.log('🎉 Seeding successfully completed!');
  console.log(`✅ Seeded ${seedData.authors.length} authors (AUTH001 - AUTH010)`);
  console.log(`✅ Seeded ${totalBooksSeeded} books (BK001 - BK018)`);
  console.log('✅ Seeded 1 default Admin account');
  console.log('----------------------------------------------------');
  console.log('🔑 TEST LOGIN CREDENTIALS:');
  console.log('   Admin:  email="admin@bookleaf.com"     password="Admin@123"');
  console.log('   Author: email="priya.sharma@email.com" password="Author@123"');
  console.log('   (All seeded authors share password: "Author@123")');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      pool.end();
      process.exit(1);
    });
}

export { seed };
