This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
cd /Users/abuzada/Desktop/QuadrantStress/stresssense
npm run dev
ADMIN: admin@stresssense.demo / StressDemo123!
MANAGER: manager@stresssense.demo / StressDemo123!
## Daily stress surveys (auto-generated)

Env vars (server-side only):

- `OPENAI_API_KEY` – OpenAI API key for daily survey generation (AI days 11+).
- `CRON_SECRET` – secret token for the daily cron endpoint.
- `AI_MODEL_SUMMARY` – optional model override (defaults to `gpt-5-mini`).

Trigger cron manually (dev):

```bash
curl -X POST "http://localhost:3000/api/cron/daily-surveys?token=YOUR_CRON_SECRET"
```

The cron creates one daily survey per member (idempotent). The Surveys page will show today’s survey and history.

## StressSense AI attachment tests (manual)

1) Image (PNG/JPG/WebP/GIF) with a chart or numbers → ask the assistant to extract the values and comment on them.
2) PDF with text → ask a question about the document; expect a brief “document received” acknowledgment and an answer grounded in the file.
3) Unsupported file (e.g., .zip or .mp4) → expect a clear “unsupported format” error without sending the message.
