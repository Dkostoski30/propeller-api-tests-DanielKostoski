# Propeller E-Commerce GraphQL API - E2E Tests

Automated end-to-end test suite for the Propeller E-Commerce GraphQL API. This project is part of the Junior SDET assignment.

## Prerequisites

- **Node.js 20+**
- **The API must be running** at `http://localhost:3000/graphql` (see [Running the API](#running-the-api))

## Running the API

From the API project directory:

```bash
# Start the API and database
docker-compose up --build

# In a separate terminal, seed the database
docker-compose run --rm seed
```

## Installation

```bash
npm install
```

## Running the Tests

```bash
# Run all tests with verbose output
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests and generate HTML + JUnit reports (in reports/)
npm run test:report
```

### Environment Variables

| Variable  | Default                          | Description            |
|-----------|----------------------------------|------------------------|
| `API_URL` | `http://localhost:3000/graphql`   | GraphQL API endpoint   |

## Test Structure

```
src/
├── helpers/
│   ├── graphql-client.ts                  # GraphQL client & test data helpers
│   ├── global-setup.ts                    # Pre-test API health check
│   └── test-data-factory.ts              # Builder pattern for test data creation
├── products/
│   ├── product-queries.spec.ts            # Product list & single queries
│   ├── product-mutations.spec.ts          # Create, update, delete products
│   └── product-filters-pagination.spec.ts # Filtering & pagination logic
├── images/
│   ├── image-queries.spec.ts              # Image list & single queries
│   └── image-mutations.spec.ts            # Create, update, delete images
├── validation/
│   └── input-validation.spec.ts           # Boundary values, security, type coercion
├── bugs/
│   └── bug-verification.spec.ts           # Explicit bug reproduction & verification
├── schema/
│   └── schema-contract.spec.ts            # GraphQL schema contract validation
├── performance/
│   └── response-time.spec.ts              # Response time threshold assertions
├── tenant-isolation.spec.ts               # Multi-tenant data isolation
├── relationships.spec.ts                  # Product-image relationships
└── edge-cases.spec.ts                     # Missing header, cascade, pagination bounds, defaults
```

## What is Tested

- **CRUD operations** for Products and Images (create, read, update, delete)
- **Filtering** by status, name (case-insensitive partial match), and price range
- **Pagination** correctness (page offset, page size, no missing results)
- **Multi-tenant isolation** — verifying tenants cannot access each other's data via queries, mutations, or direct ID access
- **Input validation** — boundary values, empty/whitespace strings, negative numbers, type coercion
- **Security** — SQL injection, XSS payloads, javascript: protocol URLs
- **Error handling** — non-existent resources, invalid operations, malformed GraphQL
- **Relationships** — product-to-image (one-to-many) and image-to-product (many-to-one)
- **Bug verification** — dedicated tests that prove each discovered bug exists and is fixed
- **Schema contract** — introspection-based tests that catch breaking API changes (fields, types, enums, operations)
- **Performance gates** — response time assertions ensuring all endpoints respond within 2 seconds

## Bugs Discovered

The following bugs were found through the automated tests:

1. **Status filter is inverted** (`product.service.ts`) — Filtering by `ACTIVE` returns `INACTIVE` products and vice versa. The status comparison logic swaps the values.

2. **Missing tenant isolation in `findOne`** (`product.service.ts`) — The `product(id)` query does not filter by `tenantId`, allowing any tenant to fetch any product by ID. This is a data isolation vulnerability.

3. **Pagination offset is wrong** (`product.service.ts`) — The offset calculation uses `page * pageSize` instead of `(page - 1) * pageSize`. With 1-indexed pages, page 1 skips the first `pageSize` records entirely.

4. **Seed script uses non-existent method** (`seed.ts`) — `deleteAll()` does not exist on TypeORM repositories. The correct method is `delete({})`.

5. **Product price stored as integer** (`product.entity.ts`) — The price column uses `@Column({ type: 'int' })` but the GraphQL schema exposes it as `Float` and the README states "supports decimals". Decimal prices like `29.99` are truncated to `30` in the database.

6. **Image priority validation inconsistency** (`image.service.ts`) — Create rejects `priority <= 0` (correct per 1-1000 range) but update rejects `priority < 0` (allows 0, violating the documented range).
