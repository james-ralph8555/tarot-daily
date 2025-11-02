# Cloudflare Migration Guide

This guide covers migrating the Daily Tarot application from a traditional Next.js + PostgreSQL setup to Cloudflare's edge platform using Workers, Pages, and D1.

## Architecture Overview

### Current Architecture
- **Frontend**: Next.js App Router (static pages + API routes)
- **Backend**: Node.js runtime with PostgreSQL
- **Database**: PostgreSQL with JSONB, connection pooling
- **Auth**: Custom session-based with database storage

### Target Architecture
- **Frontend**: Cloudflare Pages (static assets)
- **Backend**: Cloudflare Workers (API endpoints)
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Auth**: JWT tokens stored in Cloudflare KV
- **CI/CD**: Workers Builds for automated deployments

## Migration Strategy

### Phase 1: Database Migration

#### 1.1 Create D1 Databases
```bash
# Production database
npx wrangler d1 create daily-tarot-prod

# Staging database  
npx wrangler d1 create daily-tarot-staging

# Development database
npx wrangler d1 create daily-tarot-dev
```

#### 1.2 Schema Migration
Convert PostgreSQL schema to SQLite syntax:

**Key Changes:**
- `UUID` → `TEXT PRIMARY KEY`
- `TIMESTAMPTZ` → `TEXT` (ISO strings)
- `JSONB` → `TEXT` with JSON functions
- `JSONB[]` → `TEXT` with JSON arrays
- Remove `ON DELETE CASCADE` (handle manually)

**Migration Script:**
```sql
-- users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- readings table
CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  iso_date TEXT NOT NULL,
  spread_type TEXT NOT NULL,
  hmac TEXT NOT NULL,
  intent TEXT,
  cards TEXT NOT NULL, -- JSON string
  prompt_version TEXT NOT NULL,
  overview TEXT NOT NULL,
  card_breakdowns TEXT NOT NULL, -- JSON string
  synthesis TEXT NOT NULL,
  actionable_reflection TEXT NOT NULL,
  tone TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- feedback table
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL,
  user_id TEXT,
  thumb INTEGER NOT NULL CHECK (thumb IN (-1, 1)),
  rationale TEXT,
  tags TEXT, -- JSON array
  created_at TEXT NOT NULL,
  FOREIGN KEY (reading_id) REFERENCES readings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- telemetry_events table
CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  session_id TEXT,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  data TEXT, -- JSON string
  metadata TEXT, -- JSON string
  raw_event TEXT, -- JSON string
  created_at TEXT NOT NULL
);

-- groq_usage table
CREATE TABLE groq_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  reading_id TEXT,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  request_timestamp TEXT NOT NULL,
  response_timestamp TEXT NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- push_subscriptions table
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keys TEXT NOT NULL, -- JSON string
  created_at TEXT NOT NULL
);
```

#### 1.3 Initialize Databases
```bash
# Local development
npx wrangler d1 execute daily-tarot-dev --local --file=./infra/scripts/d1-schema.sql

# Production
npx wrangler d1 execute daily-tarot-prod --remote --file=./infra/scripts/d1-schema.sql

# Staging
npx wrangler d1 execute daily-tarot-staging --remote --file=./infra/scripts/d1-schema.sql
```

### Phase 2: Authentication Rewrite

#### 2.1 Replace Database Sessions with JWT/KV
```typescript
// New auth system using Web Crypto API + KV
interface AuthToken {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

// Password hashing with Web Crypto
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt"); // Add salt
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// JWT creation
function createJWT(user: User): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Sign with secret from environment variables
  return btoa(JSON.stringify(header)) + '.' + 
         btoa(JSON.stringify(payload)) + '.' + 
         btoa('signature'); // Simplified signing
}
```

#### 2.2 KV Configuration
```bash
# Create KV namespace for sessions
npx wrangler kv:namespace create "SESSIONS"
npx wrangler kv:namespace create "SESSIONS" --preview
```

### Phase 3: API Routes to Workers

#### 3.1 Worker Structure
```
workers/
├── src/
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── logout.ts
│   │   └── session.ts
│   ├── reading/
│   │   └── route.ts
│   ├── history/
│   │   └── route.ts
│   ├── feedback/
│   │   └── route.ts
│   ├── telemetry/
│   │   └── route.ts
│   └── tuning/
│       └── route.ts
├── wrangler.toml
└── package.json
```

#### 3.2 Wrangler Configuration
```toml
name = "daily-tarot-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "daily-tarot-api-prod"

[env.staging]
name = "daily-tarot-api-staging"

[env.development]
name = "daily-tarot-api-dev"

# D1 Bindings
[[d1_databases]]
binding = "DB"
database_name = "daily-tarot-prod"
database_id = "your-prod-db-id"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "daily-tarot-staging"
database_id = "your-staging-db-id"

[[env.development.d1_databases]]
binding = "DB"
database_name = "daily-tarot-dev"
database_id = "your-dev-db-id"

# KV Bindings
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-sessions-kv-id"

[[env.staging.kv_namespaces]]
binding = "SESSIONS"
id = "your-staging-sessions-kv-id"

[[env.development.kv_namespaces]]
binding = "SESSIONS"
id = "your-dev-sessions-kv-id"

# Secrets (to be set via wrangler secret put)
# JWT_SECRET
# GROQ_API_KEY
```

#### 3.3 Main Worker Router
```typescript
// src/index.ts
import { AuthRouter } from './auth';
import { ReadingRouter } from './reading';
import { HistoryRouter } from './history';
import { FeedbackRouter } from './feedback';
import { TelemetryRouter } from './telemetry';
import { TuningRouter } from './tuning';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  GROQ_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route to appropriate handler
      if (path.startsWith('/api/auth/')) {
        return await AuthRouter.handle(request, env, path);
      } else if (path.startsWith('/api/reading')) {
        return await ReadingRouter.handle(request, env);
      } else if (path.startsWith('/api/history')) {
        return await HistoryRouter.handle(request, env);
      } else if (path.startsWith('/api/feedback')) {
        return await FeedbackRouter.handle(request, env);
      } else if (path.startsWith('/api/telemetry')) {
        return await TelemetryRouter.handle(request, env);
      } else if (path.startsWith('/api/tuning')) {
        return await TuningRouter.handle(request, env);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
```

#### 3.4 Example Worker Handler
```typescript
// src/reading/route.ts
import { Env } from '../index';

export class ReadingRouter {
  static async handle(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      return await this.createReading(request, env);
    }
    
    return new Response('Method Not Allowed', { status: 405 });
  }

  static async createReading(request: Request, env: Env): Promise<Response> {
    try {
      const body = await request.json();
      
      // Validate request body
      if (!body.intent || !body.spreadType) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Generate reading using Groq API
      const reading = await this.generateReading(body, env.GROQ_API_KEY);
      
      // Store in D1
      const readingId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO readings (
          id, user_id, iso_date, spread_type, hmac, intent, cards,
          prompt_version, overview, card_breakdowns, synthesis,
          actionable_reflection, tone, model, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        readingId,
        body.userId || null,
        new Date().toISOString().split('T')[0],
        body.spreadType,
        await this.generateHMAC(reading),
        body.intent,
        JSON.stringify(reading.cards),
        reading.promptVersion,
        reading.overview,
        JSON.stringify(reading.cardBreakdowns),
        reading.synthesis,
        reading.actionableReflection,
        reading.tone,
        reading.model,
        new Date().toISOString()
      ).run();

      return Response.json({
        id: readingId,
        ...reading
      });

    } catch (error) {
      console.error('Reading creation error:', error);
      return Response.json({ error: 'Failed to create reading' }, { status: 500 });
    }
  }

  static async generateReading(intent: string, apiKey: string): Promise<any> {
    // Call Groq API using fetch
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are a tarot reading expert...'
          },
          {
            role: 'user',
            content: `Generate a tarot reading for: ${intent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    return await response.json();
  }

  static async generateHMAC(data: any): Promise<string> {
    const dataStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode('your-hmac-secret'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataStr));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}
```

### Phase 4: Frontend Migration

#### 4.1 Static Assets to Pages
```bash
# Build Next.js for static export
cd apps/web
npm run build

# Deploy to Pages
npx wrangler pages deploy .next --project-name=daily-tarot-web
```

#### 4.2 Update API Client
```typescript
// lib/api-client.ts - Update base URLs
const API_BASE_URL = {
  development: 'http://localhost:8787/api',
  staging: 'https://daily-tarot-api-staging.your-subdomain.workers.dev/api',
  production: 'https://daily-tarot-api-prod.your-subdomain.workers.dev/api'
};

export const apiClient = {
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL[process.env.NODE_ENV || 'development']}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
};
```

### Phase 5: CI/CD Setup

#### 5.1 Workers Builds Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Wrangler
        run: npm install -g wrangler
        
      - name: Deploy Workers
        run: wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          
      - name: Deploy Pages
        run: |
          cd apps/web
          npm ci
          npm run build
          npx wrangler pages deploy .next --project-name=daily-tarot-web
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

#### 5.2 Environment Configuration
```bash
# Set environment secrets
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put GROQ_API_KEY --env production

npx wrangler secret put JWT_SECRET --env staging  
npx wrangler secret put GROQ_API_KEY --env staging
```

## Development Workflow

### Local Development
```bash
# Start Workers API locally
cd workers
npm run dev

# Start frontend locally
cd apps/web
npm run dev

# Local D1 operations
npx wrangler d1 execute daily-tarot-dev --local --command="SELECT * FROM users"
```

### Testing
```bash
# Run Workers tests
cd workers
npm test

# Run frontend tests  
cd apps/web
npm test

# Integration tests against local Workers
npm run test:integration
```

### Deployment Commands
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Promote staging to production
npm run promote:staging-to-prod
```

## Migration Checklist

### Pre-Migration
- [ ] Backup existing PostgreSQL data
- [ ] Create Cloudflare account and organizations
- [ ] Set up billing and limits
- [ ] Generate API tokens

### Database Migration
- [ ] Create D1 databases for all environments
- [ ] Convert schema to SQLite syntax
- [ ] Create migration scripts
- [ ] Test data migration with subset
- [ ] Validate data integrity

### Backend Migration
- [ ] Rewrite authentication system
- [ ] Convert all API routes to Workers
- [ ] Replace PostgreSQL queries with D1
- [ ] Update error handling
- [ ] Add comprehensive logging

### Frontend Migration
- [ ] Update API client configuration
- [ ] Test all API endpoints
- [ ] Update environment variables
- [ ] Validate authentication flow

### CI/CD Setup
- [ ] Configure Workers Builds
- [ ] Set up GitHub Actions
- [ ] Configure environment secrets
- [ ] Test deployment pipeline
- [ ] Set up rollback procedures

### Post-Migration
- [ ] Monitor performance metrics
- [ ] Check error logs
- [ ] Validate all user flows
- [ ] Update documentation
- [ ] Train team on new stack

## Cost Comparison

### Current Stack (Estimate)
- Vercel Pro: $20/month
- Railway PostgreSQL: $12/month
- Total: ~$32/month

### Cloudflare Stack (Estimate)
- Workers: Free tier covers usage ($0.50/million requests)
- D1: Free tier covers usage ($0.25/million reads, $5/million writes)
- KV: Free tier covers usage ($0.50/million operations)
- Pages: Free tier covers bandwidth
- Total: $0-$5/month for typical usage

## Performance Benefits

- **Global Edge**: Sub-100ms latency worldwide
- **Auto-scaling**: No cold start issues
- **CDN Integration**: Built-in static asset delivery
- **DDoS Protection**: Included by default
- **SSL/TLS**: Automatic certificate management

## Risks and Mitigations

### Technical Risks
- **Query compatibility**: SQLite differences from PostgreSQL
- **Concurrency**: Different transaction model
- **Data limits**: D1 storage limits vs unlimited PostgreSQL

### Mitigation Strategies
- Comprehensive testing in staging
- Gradual rollout with feature flags
- Monitoring and alerting setup
- Rollback procedures documented
