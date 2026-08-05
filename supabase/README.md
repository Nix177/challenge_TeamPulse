# Supabase Backend Setup & Security Guide — Team Pulse

This guide explains how to initialize, configure, and secure the Supabase database backend for Team Pulse.

---

## 1. Security Architecture & Principles

- **Zero Service-Role Key Exposure**: The frontend requires **only** your Supabase Project URL and the public `anon` publishable key in `src/config.js`. **NEVER** expose the `service_role` secret key in client-side code.
- **Row Level Security (RLS)**: Direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to all database tables (`rooms`, `room_counts`, `room_participants`) is strictly **REVOKED** for the `anon` role.
- **SECURITY DEFINER RPC Stored Procedures**: All frontend operations occur exclusively via controlled RPC stored procedures qualified with `SET search_path = public`.

---

## 2. Setup Instructions

1. **Create a Supabase Project**:
   - Sign in to [Supabase](https://supabase.com) and create a new project.
2. **Execute Database Schema Script**:
   - Navigate to the **SQL Editor** in your Supabase project dashboard.
   - Open [`supabase/schema.sql`](file:///e:/challenge%20huumyk/supabase/schema.sql) and paste the entire script into the SQL Editor.
   - Click **Run** to execute the script and create all tables, indexes, RLS policies, and RPC functions.
3. **Configure Frontend Credentials**:
   - In your Supabase project settings under **API**, copy:
     - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
     - **anon / public key**
   - Open `src/config.js` in Team Pulse and update the configuration object:
     ```javascript
     export const SUPABASE_CONFIG = Object.freeze({
       supabaseUrl: 'https://xyzcompany.supabase.co',
       supabaseAnonKey: 'your-anon-public-key-here',
     });
     ```

---

## 3. Scheduled Expiration Cleanup (pg_cron)

Sessions automatically expire after 12 hours. To schedule automated server-side deletion of expired sessions every hour using the Supabase `pg_cron` extension:

1. Enable `pg_cron` in Supabase Database Extensions.
2. Run the following SQL command in the SQL Editor:
   ```sql
   SELECT cron.schedule(
     'cleanup-expired-rooms-hourly',
     '0 * * * *', -- Run every hour at minute 0
     $$ SELECT public.cleanup_expired_rooms(); $$
   );
   ```

---

## 4. Verification & Testing

Verify your setup by running the automated unit and security test suite:
```bash
node --test
```
