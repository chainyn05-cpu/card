# Company 99 Employee ID Card Generator — Fresh Complete Project

## Includes
- Employee registration form (public)
- PUZZLE, BAT, POS TRAIN brands and logos
- Employee photo upload and ID card PNG/PDF download
- Admin Dashboard with password protection (password: 99VIP)
- Vercel API routes for admin login and data
- Supabase schema reference

## Important
This ZIP contains the clean project root. For GitHub, replace the project source files with the contents of this folder, keeping the files at the repository root as shown (package.json, src/, public/, api/, supabase/). Do not upload the folder inside another nested folder.

Do not run schema.sql over an existing production database unless you have reviewed it first. Do not expose SUPABASE_SERVICE_ROLE_KEY in frontend code or GitHub.

## Vercel environment variables
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server only)
- ADMIN_PASSWORD=99VIP (set this in Vercel Production variables)
- ADMIN_TOKEN_SECRET (random secret at least 32 characters)

Set the variables for Production and redeploy. The public employee form is intended to remain accessible without admin login; the dashboard uses the admin login flow.


The registration form does not ask for an employee code. For compatibility with the existing Supabase schema, submissions store an empty string in the legacy employee_id column. Existing database rows/photos are not deleted.
