# Northbeam sales assistant

A prototype that turns an inbound inquiry from Instagram, WhatsApp or email into a qualified, assigned lead and a confirmed calendar booking. The business is a fictional analytics consultancy, and every rule it follows lives in `policy.json`.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Create the tables: `npm run migrate`
4. Run tests: `npm test`
5. Start the app: `npm run dev`, then open `/sales` and sign in with any username and the `DASHBOARD_PASSWORD`.

Webhooks need a public HTTPS URL, so deploy to Railway or Render before connecting Meta.

## Environment variables

| Name | Purpose |
| --- | --- |
| DATABASE_URL, DATABASE_SSL | Postgres connection |
| ANTHROPIC_API_KEY, LLM_MODEL | Model calls |
| DASHBOARD_PASSWORD | Basic auth for the dashboard and API |
| CRON_SECRET | Optional header secret for calling the poll route from a scheduler |
| APP_SECRET_META | Meta app secret used to verify webhook signatures |
| WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID | WhatsApp Cloud API |
| INSTAGRAM_VERIFY_TOKEN, INSTAGRAM_ACCESS_TOKEN | Instagram messaging |
| EMAIL_ADDRESS, EMAIL_APP_PASSWORD, IMAP_HOST, IMAP_PORT, SMTP_HOST, SMTP_PORT, EMAIL_POLL_SECONDS | Mailbox polling and replies |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN | Google Calendar OAuth |
| CALENDAR_ID_ASHA, CALENDAR_ID_ROHAN | One test calendar per representative |

## Channel setup

- **WhatsApp:** create a Meta app with the WhatsApp product, use the test number, add your own phone as a recipient, and point the webhook at `/api/webhooks/whatsapp` subscribed to `messages`.
- **Instagram:** link an Instagram professional account, add your own accounts as testers, and point the webhook at `/api/webhooks/instagram` subscribed to `messages`. Live messaging may be blocked until Meta app review. If it is, record the exact error and mark the channel incomplete.
- **Email:** use a test Gmail account with an app password. The server checks the inbox every `EMAIL_POLL_SECONDS`, and the dashboard has a manual check button.
- **Calendar:** create an OAuth client with the Calendar scope, obtain a refresh token for the test account, and create two secondary calendars, one per representative.

## Architecture

- `lib/policy.ts` holds the deterministic rules: qualification, routing and slot generation. The model never decides these.
- `lib/llm.ts` has two model calls. `extract` returns structured facts and intent through a forced tool call. `compose` writes a short reply from a list of facts it is given.
- `lib/handle.ts` runs one conversation turn under a per-conversation Postgres advisory lock. It extracts facts, runs the rules, assigns a rep, offers slots or books.
- `lib/booking.ts` claims a single booking row per conversation, rechecks free/busy, then creates the event with a deterministic event ID.
- `lib/channels/*` hold the provider adapters. `lib/send.ts` sends replies and records failures.
- Everything is stored in Postgres, so context survives refreshes and restarts. Conversations are keyed by channel and sender, and are never merged across channels.

Reliability choices:

- Slots are only booked if they were offered to that conversation.
- A repeated confirmation hits the unique booking row and the same event ID, so no second event is created.
- On a timeout the code looks the event up by ID. If it cannot confirm, the booking is marked uncertain, not retried, and left for a person.
- Expired Meta, Google or mailbox credentials are recorded and shown as a banner and in the action log.
- Takeover is checked before each automatic action and again just before a reply is sent.
- Provider message IDs are unique, so webhook retries are ignored.

## Known limitations

- Not yet run end to end against real provider accounts. Each channel still needs your live test.
- Replies and booking logic depend on the model returning a clean extraction. If the model call fails, the message is left unanswered and logged.
- Slot offers use one slot per day to keep the options varied, not the full availability.
- WhatsApp free-form replies only work inside the 24-hour customer service window.
- Email quote stripping is basic.
- Dashboard auth is a single shared password.

## Approximate model cost

Each inbound message makes two model calls, roughly 1,200 input and 250 output tokens in total. At typical Sonnet pricing that is around one cent per message, so a lead that takes four or five messages to book costs about four to six cents. Measure this from your own usage before quoting it.

## AI tooling disclosure

This project was written with help from Claude. Add your own notes on what you reviewed and changed.
