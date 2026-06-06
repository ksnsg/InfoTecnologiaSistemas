# Aivacol — Fleet Management Platform

[![CI](https://github.com/ksnsg/InfoTecnologiaSistemas/actions/workflows/ci.yml/badge.svg)](https://github.com/ksnsg/InfoTecnologiaSistemas/actions/workflows/ci.yml)

Backend module for fleet management built as a technical assessment.
Implements a clean, modular NestJS architecture with strict typing, automated tests, Redis caching, RabbitMQ messaging, and MongoDB audit logging.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Running with Docker Compose](#running-with-docker-compose)
- [Database Migrations](#database-migrations)
- [Default Seed User](#default-seed-user)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Mock Seed Data](#mock-seed-data)
- [Project Structure](#project-structure)

---

## Tech Stack

| Technology   | Version   | Role                              |
|--------------|-----------|-----------------------------------|
| Node.js      | 20 LTS    | Runtime                           |
| NestJS       | 10+       | Framework                         |
| TypeORM      | 0.3.x     | ORM + Migrations                  |
| SQL Server   | 2022      | Primary relational database       |
| Redis        | 7         | Query caching (mandatory)         |
| RabbitMQ     | 3         | Audit event messaging (bonus)     |
| MongoDB      | 7         | Audit log persistence (bonus)     |
| Jest         | 29        | Automated tests (85 passing)      |
| Docker       | —         | 4-stage multistage Dockerfile     |

---

## Architecture Overview

```
HTTP Request
     │
     ▼
JwtAuthGuard ──► VehiclesController
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
VehiclesQueryService     VehiclesRegistrationService
  (Redis cache)               │           │
          │                   ▼           ▼
          └──► SQL Server   Cache    AuditMessagePublisher
               (TypeORM)  Invalidation      │
                                            ▼
                                        RabbitMQ
                                            │
                                            ▼
                                  ResourceAuditEventConsumer
                                            │
                                            ▼
                                        MongoDB
                                    (audit_logs collection)
```

**Domain modules:** `brands` → `models` → `vehicles` (FK chain)
**Cross-cutting:** `auth`, `cache`, `messaging`, `audit-consumer`, `database/seed`
**Base contract:** All entities extend `BaseEntity` (abstract) which provides `id` (UUID), `created_at`, `updated_at`, `created_by`.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+
- A `.env` file in the project root (see next section)

---

## Environment Variables

Create a `.env` file at the project root. All variables below are required unless marked optional:

```env
# Application
APP_PORT=3000

# SQL Server
MSSQL_HOST=sqlserver
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_SA_PASSWORD=YourStrong@Passw0rd
MSSQL_DB=aivacol_db

# TypeORM behaviour
# Set to 'true' in local dev only; use migrations in production
TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=false
# Set to 'true' to auto-run pending migrations on startup
TYPEORM_RUN_MIGRATIONS=true

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
# Cache TTL for vehicle queries in seconds (default: 60 seconds)
CACHE_TTL_SECONDS=60

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_AMQP_PORT=5672
RABBITMQ_MGMT_PORT=15672
RABBITMQ_USER=aivacol
RABBITMQ_PASSWORD=rabbitpassword
RABBITMQ_VHOST=aivacol_vhost

# MongoDB (audit)
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_USER=aivacol
MONGO_PASSWORD=mongopassword
MONGO_DB=aivacol_audit

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1d

# Seed user credentials (created automatically on first boot)
SEED_ADMIN_EMAIL=admin@aivacol.com
SEED_ADMIN_PASSWORD=Admin@Aivacol2026!

# Bcrypt
BCRYPT_SALT_ROUNDS=10
```

---

## Running with Docker Compose

```bash
# 1. Clone the repository
git clone <repository-url>
cd aivacol

# 2. Create the environment file
cp .env.example .env   # then edit .env with your values

# 3. Start all services (app + SQL Server + Redis + RabbitMQ + MongoDB)
docker compose up --build

# The API will be available at http://localhost:3000
# RabbitMQ management UI: http://localhost:15672
```

To run in detached mode:

```bash
docker compose up --build -d
docker compose logs -f app
```

To stop and remove containers:

```bash
docker compose down
# To also remove volumes (wipes all data):
docker compose down -v
```

---

## Database Migrations

Migrations are located in `src/database/migrations/` and run in timestamp order.

### Automatic (recommended)

Set `TYPEORM_RUN_MIGRATIONS=true` in `.env`. Pending migrations will be applied automatically on application startup.

### Manual

```bash
# Apply all pending migrations
npm run migration:run

# Revert the last applied migration
npm run migration:revert

# Show current migration status
npm run migration:show

# Generate a new migration from entity changes (dev only)
npm run migration:generate src/database/migrations/MigrationName
```

### Migration order

| Order | Migration                  | Creates table |
|-------|----------------------------|---------------|
| 1     | `1749100000000-CreateUsersTable`    | `users`    |
| 2     | `1749100001000-CreateBrandsTable`   | `brands`   |
| 3     | `1749100002000-CreateModelsTable`   | `models`   |
| 4     | `1749100003000-CreateVehiclesTable` | `vehicles` |

---

## Default Seed User

On first boot, `SeedService` automatically creates the default admin user required by the spec:

| Field    | Value                     |
|----------|---------------------------|
| nickname | `aivacol`                 |
| name     | `Aivacol Admin`           |
| email    | `SEED_ADMIN_EMAIL` (env)  |
| password | `SEED_ADMIN_PASSWORD` (env) |

Use this user to obtain a JWT token and authenticate all subsequent requests.

---

## API Documentation (Swagger)

Once the application is running, the interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

All endpoints are listed and grouped by resource (`auth`, `brands`, `models`, `vehicles`, `users`).
To test protected routes directly in the UI:

1. Call `POST /auth/login` with the seed credentials.
2. Copy the `access_token` from the response.
3. Click **Authorize** (top-right of the page) and paste the token.

---

## API Endpoints

All routes require `Authorization: Bearer <token>` except the login endpoint.

### Auth

| Method | Route        | Description            |
|--------|--------------|------------------------|
| POST   | `/auth/login`| Obtain JWT access token|

**Login body:**
```json
{ "nickname": "aivacol", "password": "Admin@Aivacol2026!" }
```

**Response:**
```json
{ "access_token": "<jwt>" }
```

---

### Brands *(bonus)*

| Method | Route          | Description       |
|--------|----------------|-------------------|
| POST   | `/brands`      | Create a brand    |
| GET    | `/brands`      | List all brands   |
| GET    | `/brands/:id`  | Get brand by ID   |
| PATCH  | `/brands/:id`  | Update a brand    |
| DELETE | `/brands/:id`  | Remove a brand    |

---

### Models

| Method | Route          | Description        |
|--------|----------------|--------------------|
| POST   | `/models`      | Create a model     |
| GET    | `/models`      | List all models    |
| GET    | `/models/:id`  | Get model by ID    |
| PATCH  | `/models/:id`  | Update a model     |
| DELETE | `/models/:id`  | Remove a model     |

**Create body:**
```json
{ "name": "Civic", "brandId": "<brand-uuid>" }
```

---

### Vehicles

| Method | Route            | Description         |
|--------|------------------|---------------------|
| POST   | `/vehicles`      | Register a vehicle  |
| GET    | `/vehicles`      | List all vehicles   |
| GET    | `/vehicles/:id`  | Get vehicle by ID   |
| PATCH  | `/vehicles/:id`  | Update a vehicle    |
| DELETE | `/vehicles/:id`  | Remove a vehicle    |

**Create body:**
```json
{
  "licensePlate": "ABC1D23",
  "chassis": "9BWZZZ377VT004251",
  "renavam": "01234567890",
  "year": 2022,
  "modelId": "<model-uuid>"
}
```

> GET `/vehicles` and GET `/vehicles/:id` are cached in Redis.
> Cache is automatically invalidated on every create, update, or delete.

---

## Running Tests

```bash
# Run all unit tests (no Docker required)
npm test

# Run with coverage report
npm run test:cov

# Run in watch mode
npm run test:watch

# Run Jest E2E smoke tests (no Docker required — all infrastructure is mocked)
npm run test:e2e

# Run full integration E2E tests against the live Docker environment
# Requires: docker compose up --build -d
bash test_e2e.sh
```

**Current status:** 85 unit tests, 16 test suites — all passing.

Coverage includes:
- All service business rules (`createVehicle`, `updateVehicle`, `removeVehicle`, `findAll`, `findOne`)
- Cache hit/miss scenarios
- Cache invalidation flows
- Audit event publishing (RabbitMQ)
- Error handling (`NotFoundException` propagation)
- Controller delegation contracts
- JWT authentication service

---

## Mock Seed Data

`seed_vehicles.json` (project root) contains a complete fixture with 8 brands, 19 models, and 15 vehicles using realistic Brazilian data:

- License plates in both old (`ABC1234`) and Mercosul (`BCD2E34`) formats
- 17-character VIN chassis numbers with Brazilian country prefix (`9B`)
- 11-digit RENAVAM numbers
- Model years ranging from 2019 to 2023

The file is structured as `{ brands, models, vehicles }` and is intended as reference data for manual seeding or Postman/curl integration tests. Use it as a guide to populate the API in order:

```bash
# 1. Login and capture token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"aivacol","password":"Admin@Aivacol2026!"}' \
  | jq -r '.access_token')

# 2. Create a brand (example)
curl -s -X POST http://localhost:3000/brands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Volkswagen"}'

# 3. Create a model (use the brand id returned above)
curl -s -X POST http://localhost:3000/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gol","brandId":"<brand-uuid>"}'

# 4. Register a vehicle (use the model id returned above)
curl -s -X POST http://localhost:3000/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate":"ABC1D23","chassis":"9BWZZZ377VT004251","renavam":"01234567890","year":2022,"modelId":"<model-uuid>"}'
```

Alternatively, all endpoints can be exercised interactively via the Swagger UI at `http://localhost:3000/api/docs`.

---

## Project Structure

```
src/
├── app.module.ts
├── main.ts                          # Hybrid HTTP + RabbitMQ bootstrap
├── auth/                            # JWT strategy, guards, login endpoint
├── brands/                          # Brands CRUD (bonus)
├── models/                          # VehicleModel CRUD
├── vehicles/                        # Vehicles CRUD + Redis cache
│   ├── entities/vehicle.entity.ts
│   ├── dto/
│   ├── vehicles.controller.ts
│   ├── vehicles-query.service.ts    # Read path with cache
│   ├── vehicles-registration.service.ts  # Write path
│   └── vehicle-cache-invalidation.service.ts
├── users/                           # User management
├── messaging/                       # RabbitMQ publisher
├── audit-consumer/                  # RabbitMQ consumer → MongoDB
├── cache/                           # Redis cache module
└── database/
    ├── database.module.ts           # TypeORM SQL Server config
    ├── data-source.ts               # TypeORM CLI DataSource
    ├── mongo-infra.module.ts        # MongoDB connection
    ├── migrations/                  # Versioned schema migrations
    │   ├── 1749100000000-CreateUsersTable.ts
    │   ├── 1749100001000-CreateBrandsTable.ts
    │   ├── 1749100002000-CreateModelsTable.ts
    │   └── 1749100003000-CreateVehiclesTable.ts
    └── seed/
        └── seed.service.ts          # Default admin user seed
```
