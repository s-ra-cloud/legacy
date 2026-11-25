# Project Architecture Guide

This project is a **monorepo** built with **Turbo Repo** that follows a structured approach to organize code across packages and applications.

## 📦 Packages

### Server (`packages/server`)

The server package contains business logic organized into services located in `packages/server/src/services/`. Each service follows a consistent structure:

#### Service Structure

- **`index.ts`** - Contains exported actions for the service
- **`source/`** - Database queries and external API calls (one file per request)
- **`module/`** - Reusable code that can run within transactions but never creates them (optional)
- **`action/`** - Large or complex actions moved from the index file (optional)

usually index.ts will call source directly unless it uses modules or actions.

### Database (`packages/db`)

- Uses **Kysely** for writing type-safe SQL queries
- Provides database schema and query utilities

### Shared (`packages/shared`)

- Contains common logic shared between packages and applications
- Promotes code reuse across the monorepo

### UI (`packages/ui`)

- Houses headless UI components
- Provides reusable interface elements without styling constraints

## 🚀 Applications

### API (`apps/api`)

The API application is built with **Hono** and **hono-openapi** for robust API development.

#### Structure
- **Endpoint Organization**: Each group of endpoints has its own file in `apps/api/src/router/`
- **Service Integration**: Each router file contains endpoints that interact with server services
- **Example**: Check `./apps/api/src/router/users.ts` for implementation patterns

### Client (`apps/client`)

The client application provides the user interface using modern React patterns.

#### Tech Stack
- **React Router v7** - For routing and navigation
- **React Query** - For server state management and caching
- **API Client**: All backend calls are made through the `$api` client located at `./apps/client/app/lib/api/client`

## 🏗️ Architecture Principles

1. **Separation of Concerns**: Each package has a specific responsibility
2. **Service-Oriented**: Business logic is organized into discrete services
3. **Type Safety**: Leveraging TypeScript and Kysely for compile-time guarantees
4. **Code Reuse**: Shared utilities and components across the monorepo
5. **API-First**: Well-structured API with OpenAPI documentation

## 📁 Directory Overview

```
minimal-turbo-template/
├── packages/
│   ├── server/          # Business logic and services
│   ├── db/              # Database queries and schema
│   ├── shared/          # Common utilities
│   └── ui/              # Headless components
└── apps/
    ├── api/             # Hono-based API server
    └── client/          # React-based frontend
```

This architecture promotes maintainability, scalability, and developer experience through clear separation of concerns and consistent patterns.
