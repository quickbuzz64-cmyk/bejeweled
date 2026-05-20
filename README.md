# Cozip — E-commerce Store

Full-stack e-commerce app built with React, Vite, Supabase, and an AI shopping assistant (Groq/LLaMA 3.3).

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Supabase · Zustand · Stripe · Vercel

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/madnaeem001/cozip.git
cd cozip
npm install
```

### 2. Environment variables

A `.env.local` file is already included with all keys configured. **No setup needed.**

### 3. Run locally

```bash
# Frontend + AI chat (recommended)
npm run dev:all

# Frontend only
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add all variables from `.env.local` in Vercel → **Settings → Environment Variables**
3. Click **Deploy** — Vercel auto-detects Vite

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ERR_NAME_NOT_RESOLVED` (Supabase) | Project is paused — restore it at [supabase.com/dashboard](https://supabase.com/dashboard) |
| AI chat not working locally | Run `npm run dev:all`, not just `npm run dev` |
