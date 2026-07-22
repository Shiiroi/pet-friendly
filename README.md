# Compaws (pet-friendly-ph)

Compaws tracks pet-friendly places in the Philippines through crowdsourced community reports.

## Prerequisites

- Node.js 20 or higher
- pnpm 9 or higher
- A Supabase project instance

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Shiiroi/compaws.git
   cd compaws
   ```

2. Install project dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```

4. Populate `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ENFORCE_GEOFENCE=true
   ```

## Development Commands

- Start the development server:
  ```bash
  pnpm dev
  ```
- Build the production bundle:
  ```bash
  pnpm build
  ```
- Preview the production build locally:
  ```bash
  pnpm preview
  ```
- Run the linter:
  ```bash
  pnpm lint
  ```

## Architecture Overview

Compaws uses a local-first architecture to handle offline reports and poor cellular connectivity.

### Core Components

- **Frontend Application**: Built with React, TypeScript, and Vite.
- **Service Worker**: Caches CARTO map tiles using a CacheFirst strategy. Serves API queries using a NetworkFirst strategy.
- **IndexedDB Outbox**: Stores pending reports on the device while offline. Flushes queued records to Supabase when network connection restores.
- **Geofence Validation**: Verifies device GPS coordinates against place coordinates before accepting contributions.
- **Supabase Backend**: Manages place data, report summaries, and consensus calculations using PostgreSQL views and functions.

## Writing Style Guide

Consult [.agents/skills/ste-lite-docs/SKILL.md](file:///Users/vince/personal-projects/pet-friendly/pet-friendly-ph/.agents/skills/ste-lite-docs/SKILL.md) when writing documentation or code comments for this repository.
