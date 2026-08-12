const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export const env = {
  apiUrl: API_URL.replace(/\/$/, ''),
  isProduction: process.env.NODE_ENV === 'production',
};
