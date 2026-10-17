# Developer Credit & Usage Terms

**Developed by Chai.**

**Company 99 — Internal Use Only.** This project is intended for internal use within Company 99. Unauthorized copying, redistribution, resale, modification, or use outside Company 99 is prohibited without prior written authorization from the relevant rights holder. All rights are reserved subject to applicable ownership and licensing agreements.

See [`LICENSE`](./LICENSE) for the full project usage notice.

---

# Employee ID Card Generator

Vercel-ready React + Vite starter for staff ID cards with three supplied logos. It is configured for CLOUD MODE by default. Add the Supabase environment variables before deploying. The app will clearly show “CLOUD SETUP REQUIRED” and block submissions until the cloud credentials are configured. To intentionally use browser-local demo mode, set `VITE_DEMO_MODE=true`.
- PUZZLE
- BAT
- POS TRAIN

Features:
- Brand themes: BAT red, POS TRAIN green, PUZZLE blue
- Employee self-registration form
- Live ID card preview
- Photo upload validation (image, max 5 MB)
- PNG and 54 × 86 mm PDF download
- Admin dashboard, search, approval status, approved cards export to A4 PDF
- Optional Supabase cloud database, photo storage, and email/password admin sign-in
- Demo mode works locally in one browser with localStorage (not cloud synced)

## 1. Run locally
Install Node.js LTS, unzip the project, then run:

```bash
npm install
npm run dev
```

## 2. Deploy to Vercel
1. Upload this folder to a new GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework should be detected as Vite. Build command: `npm run build`; output directory: `dist`.
4. Deploy. Cloud mode requires the Supabase environment variables below. Do not collect real employee submissions until Supabase setup and policies are complete.

## 3. Enable cloud storage with Supabase
1. Create a project at https://supabase.com.
2. In Project Settings → API, copy the Project URL and anon/publishable key.
3. In Supabase SQL Editor, run the entire `supabase/schema.sql` file from this project. This creates the `public.employees` table and private `employee-photos` Storage bucket. The app uses `employees` (not a separate table named `employee_cards`).
4. In Project Settings → API, copy the Project URL and anon/publishable key. For local development, copy `.env.example` to `.env.local` and replace the placeholder values. For Vercel, add these same two values in Project Settings → Environment Variables.
5. Add the two Vite environment variables in Vercel Project Settings → Environment Variables, then redeploy. No Supabase Auth user is needed for the requested public-dashboard mode.

Important:
- Never expose the Supabase `service_role` key in the frontend or Vercel `VITE_` variables.
- This requested no-login mode intentionally allows anonymous visitors to read employee records and photos as well as submit forms. Anyone who can access the website can see/export all employee information. Run the updated `supabase/schema.sql` to apply the matching RLS policies.
- This is a starter implementation; before broad production use, consider adding CAPTCHA/rate limits, invite-only registration links, file moderation, and audit logs.
- Employee data and photos are personal information. Share the registration link only with intended staff.
- Uploaded photos are stored in Supabase Storage. The updated public-dashboard SQL policy permits anonymous reads so the Dashboard can display photos without login.
- For large print runs, verify printer settings and card stock. PDF export for an individual card is 54 × 86 mm. A4 batch export fits 9 cards per page.

## 4. Logo files
The files under `public/logos/` are copied from the images supplied in the conversation. Replace them only if you want updated source artwork.


## Photo adjustment and public Dashboard
- Employees can adjust the photo zoom, horizontal position, and vertical position before downloading the card.
- The Dashboard opens without login. There is no Approve workflow; every successful submission appears as Submitted. The dashboard refreshes automatically every 10 seconds while open, and also has a manual Refresh button.
- Public Dashboard is intentionally not private. Anyone who can access the deployed site may read/export employee records and photos. Use only if the company accepts this exposure.


## Submissions and spreadsheet export
- The Admin Dashboard can export visible employee submissions to a UTF-8 CSV file that opens in Microsoft Excel.
- In DEMO mode, records are saved only in the current browser's local storage. This means only submissions made in that same browser/device appear in the dashboard.
- To collect all employees' submissions centrally from different devices, configure Supabase using the steps above and set Vercel environment variables. Cloud mode is enabled by default unless `VITE_DEMO_MODE=true` is explicitly set.


## Cloud connection checklist (follow in order)
1. Run this project's `supabase/schema.sql` in the SQL Editor for the same Supabase project used in the URL.
2. Confirm Table Editor contains `public.employees` with columns such as `brand`, `full_name`, `position`, `employee_id`, `photo_path`, `status`, and `created_at`.
3. Confirm Storage contains the private bucket `employee-photos`.
4. Add the Project URL and anon/publishable key to Vercel Environment Variables. Do not use `service_role` or secret keys in `VITE_` variables.
5. Redeploy after adding variables; Vite environment variables are baked in at build time.
6. Test with a non-sensitive sample employee first. Submit should show a success notice; open Admin Dashboard and the record/photo should appear. The list refreshes every 10 seconds; Export Excel / CSV downloads the visible filtered records.
8. For local development, create `.env.local` from `.env.example`, then run `npm install` and `npm run dev`.

If the SQL Editor already has a test table with only `id` and `created_at`, that is not the table this app reads. Run the provided `supabase/schema.sql`; it creates `public.employees`. Do not paste any Supabase secret/service-role key into chat or into frontend code.


## Important: Vercel Supabase URL
Set `VITE_SUPABASE_URL` to the Supabase **Project URL root only**, for example `https://your-project-ref.supabase.co`.
Do not append `/rest/v1`, `/storage/v1`, `/auth/v1`, or any table/bucket path. Set `VITE_SUPABASE_ANON_KEY` to the project's publishable key (`sb_publishable_...`) or legacy anon key. Never use a `sb_secret_...` or `service_role` key in a `VITE_` variable.
After changing Vercel environment variables, redeploy the project.


## Admin password protection (production)

The Admin Dashboard is protected by a Vercel serverless login endpoint. Employee form submission stays public; only the admin API can read employee records and create short-lived signed photo URLs.

### Vercel Environment Variables
Keep the existing client-side variables:
- `VITE_SUPABASE_URL` = Supabase Project URL root
- `VITE_SUPABASE_ANON_KEY` = publishable/anon key

Add these **server-only** variables (do not prefix with `VITE_`):
- `SUPABASE_URL` = same Supabase Project URL root
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role/secret key (Vercel server-side only; never expose it in frontend or commit it to GitHub)
- `ADMIN_PASSWORD` = your private Admin password, at least 12 characters
- `ADMIN_TOKEN_SECRET` = a random secret of at least 32 characters

Generate a token secret locally with Node.js: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
Do not send passwords or service-role keys in chat. Never add the service-role key to any `VITE_` variable.

### Apply the secure Supabase policies
1. In Supabase SQL Editor, run the updated `supabase/schema.sql` against the same project.
2. This removes existing public employee-table policies and the older public photo-read policies for this app, keeps anonymous `INSERT` of `Pending` employee forms and anonymous photo upload, and disables public photo access.
3. Existing employee rows and photo files are not deleted. The bucket becomes private; the Admin API creates signed photo links for the dashboard.
4. Add the four server-only variables above in Vercel → Project Settings → Environment Variables. Keep the two existing `VITE_` client variables too.
5. Redeploy the Production deployment. Then test submitting one sample employee in a private/incognito window and unlock Admin in a normal window.

Admin login tokens expire after 8 hours and are held in session storage. Use **Lock / Logout** when finished. Export CSV and A4 PDF run only after the dashboard has been unlocked. Because the browser exports the records already loaded into the Admin Dashboard, do not share that dashboard session/device with untrusted people.

**Important migration note:** Running the SQL changes access policies and makes the photo bucket private but does not delete current records/photos. Test with one sample after deployment. If other unrelated apps share `storage.objects` policies that use names containing `idcard` or `employee photo`, review the policy cleanup block before running it.


## 5. Set the Admin Dashboard password

In **Vercel → Project → Settings → Environment Variables**, add:

- `ADMIN_PASSWORD` = `Chaivip99`
- `ADMIN_TOKEN_SECRET` = a randomly generated secret of at least 32 characters (do not use the Admin password here)
- `SUPABASE_URL` = your Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service-role key (server-side only; never prefix this with `VITE_`)

Save the variables and **Redeploy**. The password `Chaivip99` is checked by the server API; it is not embedded in the frontend source. After deployment, open Admin Dashboard and enter `Chaivip99`. Employees can still submit the form without this password.

Security note: `Chaivip99` is a relatively guessable password. For production, use a longer unique password (12+ characters) and enable Vercel deployment protection or add login rate-limiting if the dashboard contains sensitive employee information.


Set `ADMIN_PASSWORD=99VIP` in Vercel Production. The registration form no longer requires or displays an employee code.
