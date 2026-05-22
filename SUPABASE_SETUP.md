# Dressi Supabase Setup

Use this once before deployment.

## 1. Create the database tables

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Click `New query`.
4. Open `supabase-schema.sql` from this project.
5. Copy the full SQL.
6. Paste it into Supabase.
7. Click `Run`.

## 2. Check keys

The website uses:

```js
SUPABASE_URL = 'https://lkvdmjostnfbhdirfapq.supabase.co'
```

The public anon key is stored in:

```txt
assets/js/supabase-config.js
```

Do not put the `service_role` secret key in frontend code.

## 3. Deploy

Push this project to GitHub, then import that GitHub repository in Vercel.
This is a static project, so Vercel does not need a build command.

After deployment:

- Dresses are saved in the `dresses` table.
- Orders are saved in the `orders` table.
- Open clients receive live updates through Supabase Realtime.
