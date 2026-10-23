import dotenv from 'dotenv';
dotenv.config();

// Strict configuration enforcement: every required environment variable must be present in .env
const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'FRONTEND_URL',
  'AWS_REGION',
  'SQS_QUEUE_URL',
] as const;

for (const envVar of requiredEnvVars) {
  if (process.env[envVar] === undefined) {
    throw new Error(
      `FATAL CONFIGURATION ERROR: ${envVar} must be defined in your .env file. No fallback is permitted.`
    );
  }
}

export const env = {
  PORT: parseInt(process.env.PORT as string, 10),
  NODE_ENV: process.env.NODE_ENV as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
  FRONTEND_URL: process.env.FRONTEND_URL as string,
  AWS_REGION: process.env.AWS_REGION as string,
  SQS_QUEUE_URL: process.env.SQS_QUEUE_URL as string,
};
