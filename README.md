# Mongo Migration Tool · [mongomigrate.app](https://mongomigrate.app)

Open-source web app to migrate data between MongoDB databases. Enter your source and target connection strings, pick collections, and run the migration from the browser.

| | Link |
|---|------|
| **Website** | **[mongomigrate.app](https://mongomigrate.app)** |
| **Repository** | [github.com/dogukandogru/mongo-migration-tool](https://github.com/dogukandogru/mongo-migration-tool) |

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Driver-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Simple 3-step wizard**: Connect → Select → Migrate
- **Real-time progress**: Stream-based progress tracking for each collection
- **Two migration modes**: Overwrite (drop & recreate) or Merge (skip duplicates)
- **Index preservation**: Automatically copies indexes from source to target
- **Secure by design**: Connection strings are never stored, logged, or cached
- **Batch processing**: Processes documents in batches of 500 for reliability

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: MongoDB Node.js Driver
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/dogukandogru/mongo-migration-tool.git
cd mongo-migration-tool
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How It Works

1. **Connect**: Enter MongoDB connection strings for both source and target databases. The tool validates each connection before proceeding.

2. **Select Collections**: Browse all collections in the source database. Select which ones to migrate and choose the migration mode:
   - **Overwrite**: Drops the target collection and recreates it with source data
   - **Merge**: Inserts documents, skipping any with duplicate `_id` values

3. **Migrate**: The tool processes each collection in batches, streaming real-time progress updates. Indexes are also copied from source to target.

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dogukandogru/mongo-migration-tool)

### Important Notes for Vercel

- **Hobby Plan**: Serverless functions have a 10-second timeout. Suitable for small databases only.
- **Pro Plan**: Functions can run up to 300 seconds (`maxDuration: 300` is configured). Recommended for larger migrations.
- For very large databases, consider running locally or on a server with no timeout limits.

Point your custom domain (**mongomigrate.app**) to the Vercel project in the project **Settings → Domains**.

## Security

- Connection strings are transmitted via HTTPS and processed in-memory only
- No data is persisted between requests
- No analytics, tracking, or third-party services
- Server-side processing ensures credentials never reach the browser after submission

## License

MIT
