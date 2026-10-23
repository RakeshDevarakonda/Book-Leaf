import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Strict secret enforcement in production
if (isProduction && (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET)) {
  throw new Error('FATAL: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be explicitly set in production!');
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bookleaf',
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || (isProduction ? '' : 'dev_insecure_access_secret_change_in_env'),
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || (isProduction ? '' : 'dev_insecure_refresh_secret_change_in_env'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL || '',
};
