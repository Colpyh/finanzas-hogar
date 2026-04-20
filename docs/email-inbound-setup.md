# Email Inbound Setup

Pipeline: Gmail → Postmark (inbound) → `POST /api/webhooks/email/[householdId]` → `pending_expense` row → `/gastos-pendientes` UI.

## Required env vars

Add to Vercel and `.env.local`:

```
WEBHOOK_SECRET=<64-char random string>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
```

Generate the secret:

```sh
openssl rand -hex 32
```

## Step 1 — Postmark account

1. Create a free account at [postmarkapp.com](https://postmarkapp.com). The free tier includes 100 inbound emails/month.
2. In the Postmark dashboard, create an **Inbound Server** (not a transactional server).
3. Note the inbound address — it looks like `abc123@inbound.postmarkapp.com`.

## Step 2 — Webhook URL

Set the **Inbound Webhook URL** on the Postmark Inbound Server to:

```
https://<your-app>.vercel.app/api/webhooks/email/<householdId>?secret=<WEBHOOK_SECRET>
```

Where:
- `<your-app>` is your Vercel deployment URL
- `<householdId>` is the UUID of your household (find it in the Supabase dashboard under the `household` table, or copy it from your app URL after onboarding)
- `<WEBHOOK_SECRET>` is the same value you set in the `WEBHOOK_SECRET` env var

## Step 3 — Supabase service role key

1. Open the Supabase dashboard → **Settings → API**.
2. Copy the **service_role** key (not the anon key).
3. Add it as `SUPABASE_SERVICE_ROLE_KEY` in Vercel and `.env.local`.

## Step 4 — Gmail filter

1. Open Gmail → **Settings (gear icon) → See all settings → Filters and Blocked Addresses → Create a new filter**.
2. In the **From** field, enter: `contacto@bci.cl`
3. Click **Create filter**.
4. Check **Forward it to** and add the Postmark inbound address (e.g. `abc123@inbound.postmarkapp.com`).
   - Gmail will send a forwarding confirmation email. See Step 5.
5. Optionally check **Apply to matching conversations** to process existing BCI emails.
6. Click **Create filter**.

## Step 5 — Confirm Gmail forwarding

Gmail sends a verification email to the Postmark inbound address before activating forwarding.

1. In the Postmark dashboard, go to **Activity** on your Inbound Server.
2. Find the verification email from Gmail (it contains a confirmation URL).
3. Copy the URL from the email body and open it in your browser.
4. Gmail will show a confirmation — click **Confirm**.

Forwarding is now active. Every future BCI email received by Gmail will be forwarded to Postmark, which POSTs your webhook and creates a `pending_expense` row visible at `/gastos-pendientes`.

## Verifying it works

1. Make a purchase with your BCI debit card.
2. Wait for the notification email from BCI.
3. Check the Postmark Inbound Server **Activity** tab — you should see the forwarded email.
4. Navigate to `/gastos-pendientes` in the app — the new pending expense should appear.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No row created, Postmark shows non-2xx | Verify `WEBHOOK_SECRET` matches the `?secret=` query param in the webhook URL |
| Row created but `parsed_source = 'unknown'` | The BCI email format may have changed; check `raw_payload` in the Supabase dashboard and update the parser |
| Forwarding not working | Confirm the Gmail verification step (Step 5) was completed |
| `SUPABASE_SERVICE_ROLE_KEY is not set` error | Add the env var to Vercel and redeploy |
