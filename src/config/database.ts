import { neon } from '@neondatabase/serverless';

// Neon database configuration
const DATABASE_URL = (import.meta as any).env?.VITE_DATABASE_URL || '';

// Create a query function
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Check if Neon is configured
export const isDatabaseConfigured = () => {
  return DATABASE_URL && DATABASE_URL !== '';
};

// Get database connection (for API routes)
export function getDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  return neon(dbUrl);
}

