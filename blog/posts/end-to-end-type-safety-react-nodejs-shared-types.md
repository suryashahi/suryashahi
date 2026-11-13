---
title: "End-to-End Type Safety: React, Node.js, and Shared Types"
date: "2025-10-28"
category: "Full Stack"
readTime: "10 min read"
description: "How to share TypeScript types between frontend and backend using monorepos, tRPC, or OpenAPI generation — eliminating API contract bugs before they reach production."
tags: ["TypeScript", "React", "Node.js", "Full Stack", "tRPC", "Monorepo"]
heroImage: "blog-placeholder-2.webp"
---

# End-to-End Type Safety: React, Node.js, and Shared Types

One of the most frustrating bugs in full-stack development is an API contract mismatch — the backend returns `user_id` but the frontend expects `userId`, or a required field becomes optional without anyone noticing. These bugs slip through code review, pass tests, and explode in production. Here's how to eliminate them entirely with end-to-end type safety.

## The Problem: Drifting Contracts

In a typical React + Node.js project, types live in two places:

- **Backend:** Database schema → ORM models → API response types
- **Frontend:** API client → Response types → Component props

When the backend changes (new field, renamed property, changed optionality), the frontend doesn't know — until runtime. Even with OpenAPI/Swagger docs, the frontend types are often manually maintained or generated once and forgotten.

## Solution 1: Monorepo with Shared Package (Recommended)

The most robust approach: put shared types in a package both apps depend on. Tools like **Turborepo** or **Nx** make this painless.

### Project Structure

```
my-app/
├── apps/
│   ├── frontend/          # React + Vite
│   └── backend/           # Node.js + Fastify/Express
├── packages/
│   └── shared-types/      # Published internally
│       ├── src/
│       │   ├── api.ts     # Request/Response types
│       │   ├── domain.ts  # Domain models (User, Order, etc.)
│       │   └── index.ts   # Barrel export
│       └── package.json
├── package.json           # Root workspace
├── turbo.json
└── tsconfig.base.json
```

### Shared Types Package

```typescript
// packages/shared-types/src/domain.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// packages/shared-types/src/api.ts
import { User, PaginatedResponse } from './domain';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string; // Min 8 chars, validated on backend
}

export interface CreateUserResponse {
  user: User;
  accessToken: string;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: User['role'];
}

export type GetUsersResponse = PaginatedResponse<User>;

// packages/shared-types/src/index.ts
export * from './domain';
export * from './api';
```

### Using in Backend (Fastify + TypeBox)

```typescript
// apps/backend/src/routes/users.ts
import { FastifyInstance } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { CreateUserRequest, CreateUserResponse, GetUsersQuery, GetUsersResponse } from '@my-app/shared-types';

// Re-validate at runtime with TypeBox (matches shared types exactly)
const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  password: Type.String({ minLength: 8 }),
});

type CreateUserBodyType = Static<typeof CreateUserBody>;
// Compile-time check: CreateUserBodyType matches CreateUserRequest

export async function userRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateUserBodyType; Reply: CreateUserResponse }>(
    '/users',
    { schema: { body: CreateUserBody, response: { 201: { $ref: 'CreateUserResponse#' } } } },
    async (request, reply) => {
      const user = await createUser(request.body);
      return reply.code(201).send({ user, accessToken: generateToken(user) });
    }
  );

  fastify.get<{ Querystring: GetUsersQuery; Reply: GetUsersResponse }>(
    '/users',
    { schema: { querystring: GetUsersQuerySchema, response: { 200: { $ref: 'GetUsersResponse#' } } } },
    async (request, reply) => {
      return getUsers(request.query);
    }
  );
}
```

### Using in Frontend (TanStack Query)

```typescript
// apps/frontend/src/api/users.ts
import { CreateUserRequest, CreateUserResponse, GetUsersQuery, GetUsersResponse } from '@my-app/shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const api = {
  createUser: (data: CreateUserRequest) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json() as Promise<CreateUserResponse>),

  getUsers: (params: GetUsersQuery) =>
    fetch(`/api/users?${new URLSearchParams(params as any).toString()}`)
      .then(res => res.json() as Promise<GetUsersResponse>),
};

// Hooks with full type inference
export function useUsers(params: GetUsersQuery = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.getUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

**Result:** Change `User` in `shared-types` → TypeScript errors in both frontend and backend instantly. No runtime surprises.

## Solution 2: tRPC — End-to-End Types Without Code Generation

[tRPC](https://trpc.io/) lets you define procedures on the backend and call them from the frontend with full type inference — no OpenAPI, no codegen, no build step.

```typescript
// server/router.ts
import { z } from 'zod';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  createUser: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
      password: z.string().min(8),
    }))
    .output(z.object({
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['user', 'admin']),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
      accessToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      return createUser(input);
    }),

  getUsers: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      search: z.string().optional(),
    }))
    .output(z.object({
      data: z.array(z.object({ /* User shape */ })),
      meta: z.object({ /* pagination */ }),
    }))
    .query(async ({ input }) => {
      return getUsers(input);
    }),
});

export type AppRouter = typeof appRouter;
```

```typescript
// client/hooks.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'server/router';

export const trpc = createTRPCReact<AppRouter>();

// Usage in component
function UserList() {
  const { data } = trpc.getUsers.useQuery({ page: 1, limit: 10 });
  // `data` is fully typed: { data: User[], meta: PaginationMeta }

  const createUser = trpc.createUser.useMutation();
  // createUser.mutate() expects { email, name, password } — enforced at compile time
}
```

**Trade-off:** tRPC is fantastic for TypeScript-only stacks. If you need to support non-TS clients (mobile, third-party), you'll need OpenAPI anyway.

## Solution 3: OpenAPI + Codegen (Polyglot Friendly)

When you need to support multiple clients (React, React Native, Go, Python), generate types from a single OpenAPI spec.

```bash
# 1. Backend generates OpenAPI spec (Fastify + fastify-swagger)
# 2. Frontend generates types from spec

# package.json (frontend)
{
  "scripts": {
    "generate:api": "openapi-typescript http://localhost:3000/docs/json -o src/api/schema.d.ts"
  }
}
```

```typescript
// src/api/schema.d.ts (auto-generated)
export interface paths {
  "/users": {
    post: {
      requestBody: { content: { "application/json": CreateUserRequest } };
      responses: { 201: { content: { "application/json": CreateUserResponse } } };
    };
    get: {
      parameters: { query: GetUsersQuery };
      responses: { 200: { content: { "application/json": GetUsersResponse } } };
    };
  };
}

// Type-safe fetch wrapper
async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

// Usage — fully typed!
const user = await apiClient<paths['/users']['post']['responses'][201]['content']['application/json']>(
  '/users',
  { method: 'POST', body: JSON.stringify({ email: 'test@test.com', name: 'Test', password: 'password123' })}
);
```

### Tools for OpenAPI Generation

| Tool | Input | Output | Best For |
|------|-------|--------|----------|
| `openapi-typescript` | OpenAPI 3.x JSON/YAML | TypeScript interfaces | React/Vue/Vanilla TS |
| `hey-api/openapi-ts` | OpenAPI 3.x | Types + client (TanStack Query, SWR, Axios) | Full client generation |
| `orval` | OpenAPI 3.x | Types + React Query/SWR/Zod validators | React ecosystems |
| `oazapfts` | OpenAPI 3.x | Functional client + types | Functional programming |

## Comparison: Which to Choose?

| Approach | Type Safety | Setup Effort | Non-TS Clients | Runtime Validation |
|----------|-------------|--------------|----------------|-------------------|
| Monorepo + Shared Types | ✅ Perfect | Medium | ❌ No | Manual (Zod/TypeBox) |
| tRPC | ✅ Perfect | Low | ❌ No | Built-in (Zod) |
| OpenAPI + Codegen | ✅ Good | Medium | ✅ Yes | Optional (Zod/TypeBox) |

## My Recommendation

**Start with a monorepo + shared types package.** It gives you:

- Zero runtime overhead
- Instant feedback in IDE (both sides)
- Single source of truth for domain models
- Easy to migrate to tRPC or OpenAPI later if needed

I used this approach in [BrewQ](https://github.com/suryashahi/brewq) — a café management platform with React frontend and Node.js backend. The shared types package contains 50+ interfaces for orders, menu items, users, analytics, and real-time events. Zero API contract bugs in production.

## Bonus: CI Guardrails

Add a check to fail CI if types drift:

```yaml
# .github/workflows/type-check.yml
name: Type Check

on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build shared types
        run: npm run build --filter=@my-app/shared-types

      - name: Type check frontend
        run: npm run typecheck --filter=frontend

      - name: Type check backend
        run: npm run typecheck --filter=backend
```

---

*Next up: Deploying TensorFlow models to production — lessons from the Plant Disease Detection project (model optimization, ONNX conversion, edge deployment). Stay tuned!*