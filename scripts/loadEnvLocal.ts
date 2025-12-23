import dotenv from 'dotenv';

// Explicitly load .env.local for scripts (Vite/Express already load it elsewhere).
// This keeps offline scripts consistent for CI/local runs.
dotenv.config({ path: '.env.local' });
