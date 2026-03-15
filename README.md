# Contracking

Contraction tracking app for labor. One-tap to start/stop, optional details, shareable public link for the doctor.

## Features

- **One-tap tracking** — big button to start/stop contractions, timer runs automatically
- **Optional details** — intensity (bars), position (icons), notes — all optional, zero typing required
- **Events** — log water break, meals, dilation, notes with a single tap
- **Public link** — share a live-updating URL with the doctor (no auth required to view)
- **Auto-analysis** — regularity detection, 5-1-1 pattern alerts, averages
- **Dark/Light** — follows system preference, OLED-friendly dark mode

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **API**: [Cloudflare Workers](https://workers.cloudflare.com)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Frontend**: React 19 + Tailwind CSS
- **Auth**: Magic link via [Resend](https://resend.com) + [React Email](https://react.email)
- **Lint/Format**: [Biome](https://biomejs.dev)
- **Icons**: [Lucide](https://lucide.dev)

## Project Structure

```
contracking-app/
├── apps/
│   ├── api/              # Cloudflare Worker
│   └── dashboard/        # React 19 + Tailwind
├── libs/
│   └── shared/           # Types, enums, constants
├── package.json          # Bun workspaces
├── tsconfig.base.json
└── biome.json
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2+
- [Cloudflare account](https://dash.cloudflare.com) (free tier works)
- [Resend account](https://resend.com) (free tier: 100 emails/day)

### Setup

```bash
# Install dependencies
bun install

# Start API locally
cd apps/api && bunx wrangler dev

# Start dashboard locally
cd apps/dashboard && bun run dev
```

### Deploy

```bash
# Create D1 database
cd apps/api && bunx wrangler d1 create contracking

# Set secrets
echo "YOUR_KEY" | bunx wrangler secret put RESEND_API_KEY
echo "https://your-domain.com" | bunx wrangler secret put DASHBOARD_URL

# Run migrations
bunx wrangler d1 migrations apply contracking --remote

# Deploy API
bunx wrangler deploy

# Deploy dashboard
cd apps/dashboard && bun run build
bunx wrangler pages deploy dist --project-name=contracking
```

## Development

```bash
bun test              # Run all tests
bunx biome check .    # Lint and format check
bunx biome check --write .  # Auto-fix
```

## License

[MIT](LICENSE)
