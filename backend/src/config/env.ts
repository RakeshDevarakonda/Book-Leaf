import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bookleaf',
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'authorflow_access_secret_key_jwt_2026',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'authorflow_refresh_secret_key_jwt_2026',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
