# Propeller E-Commerce GraphQL API — E2E Test Suite

Automated end-to-end test suite for the [Propeller E-Commerce GraphQL API](https://github.com/propeller-commerce/propeller-sdet-task-daniel-kostoski). Built with **Jest**, **TypeScript**, and native `fetch` — no external HTTP libraries required.

This is a standalone project that tests the API externally over HTTP, treating it as a black box. The API and this test suite are two separate applications, as required by the assignment.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Tests](#running-the-tests)
- [Project Structure](#project-structure)
- [Test Coverage Overview](#test-coverage-overview)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [CI/CD Pipeline](#cicd-pipeline)
- [Bugs Discovered](#bugs-discovered)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Jest 29** | Test runner and assertion library |
| **TypeScript 5** | Type safety across all test code |
| **ts-jest** | Run `.ts` test files directly without a separate compile step |
| **Node.js 20+** | Runtime (uses native `fetch` — no Axios/Supertest needed) |
| **jest-html-reporters** | HTML test report generation |
| **jest-junit** | JUnit XML reports for CI integration |

---

## Prerequisites

- **Node.js 20+** (required for native `fetch` support)
- **Docker & Docker Compose** (to run the API locally)
- The API repository cloned locally: `propeller-sdet-task-daniel-kostoski`

---

## Getting Started

### 1. Start the API

From the **API project** directory:

```bash
# Start the API and PostgreSQL database
docker-compose up --build

# In a separate terminal, seed the database with test data
docker-compose run --rm seed
```

The API will be available at `http://localhost:3000/graphql`.

### 2. Install test dependencies

From **this project** directory:

```bash
npm install
```

### 3. Run the tests

```bash
npm test
```

---

## Running the Tests

```bash
# Run all tests with verbose output (default)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with code coverage
npm run test:coverage

# Run tests and generate HTML + JUnit reports (output in reports/)
npm run test:report

# Type-check without running tests
npm run build
```

All tests run sequentially (`--runInBand`) to avoid race conditions on shared API state.

---

## Project Structure

```
propeller-api-e2e-tests/
├── .github/
│   └── workflows/
│       └── ci.yml                              # GitHub Actions CI/CD pipeline
├── src/
│   ├── helpers/
│   │   ├── graphql-client.ts                   # GraphQL client & test data helpers
│   │   ├── global-setup.ts                     # Pre-test API health check (10 retries)
│   │   └── test-data-factory.ts                # Builder pattern for fluent test data creation
│   ├── products/
│   │   ├── product-queries.spec.ts             # Product list & single-product queries
│   │   ├── product-mutations.spec.ts           # Create, update, delete products
│   │   └── product-filters-pagination.spec.ts  # Filtering by status/name/price & pagination
│   ├── images/
│   │   ├── image-queries.spec.ts               # Image list & single-image queries
│   │   └── image-mutations.spec.ts             # Create, update, delete images
│   ├── validation/
│   │   └── input-validation.spec.ts            # Boundary values, security payloads, type coercion
│   ├── bugs/
│   │   └── bug-verification.spec.ts            # Explicit reproduction tests for discovered bugs
│   ├── schema/
│   │   └── schema-contract.spec.ts             # Introspection-based schema contract validation
│   ├── performance/
│   │   └── response-time.spec.ts               # Response time gates (all endpoints < 2s)
│   ├── tenant-isolation.spec.ts                # Multi-tenant data isolation (queries + mutations)
│   ├── relationships.spec.ts                   # Product ↔ Image relationship tests
│   └── edge-cases.spec.ts                      # Missing headers, cascading deletes, boundary values
├── reports/                                    # Generated test reports (HTML, JUnit XML)
├── jest.config.ts                              # Jest configuration
├── tsconfig.json                               # TypeScript configuration
├── package.json
├── CI-CD.md                                    # CI/CD pipeline documentation
├── BUGS-FOUND.md                               # Documented bugs with reproduction steps
└── README.md
```

---

## Test Coverage Overview

**12 test suites | 156 tests**

| Suite | File | Tests | What it covers |
|-------|------|------:|----------------|
| Product Queries | `product-queries.spec.ts` | 8 | List queries, tenant filtering, field types, single product by ID, error handling |
| Product Mutations | `product-mutations.spec.ts` | 12 | Create with all status values, update name/price/status, delete, error on non-existent |
| Filters & Pagination | `product-filters-pagination.spec.ts` | 14 | Status/name/price filters, combined filters, page size limits, page offset, full pagination walk |
| Image Queries | `image-queries.spec.ts` | 6 | List, tenant filtering, productId filtering, product relation, single image by ID |
| Image Mutations | `image-mutations.spec.ts` | 15 | Create (URL/priority/product link), orphan images, update, delete, validation errors |
| Input Validation | `input-validation.spec.ts` | 28 | Empty/whitespace names, negative prices, SQL injection, XSS, invalid URLs, priority boundaries, type coercion, null fields |
| Tenant Isolation | `tenant-isolation.spec.ts` | 11 | Product/image list isolation, single-item access across tenants, cross-tenant update/delete prevention |
| Relationships | `relationships.spec.ts` | 8 | One-to-many (product → images), many-to-one (image → product), orphan images, linking/unlinking |
| Schema Contract | `schema-contract.spec.ts` | 21 | Root types, Product/Image fields, ProductStatus enum, all query/mutation operations, input types |
| Performance | `response-time.spec.ts` | 8 | All queries and mutations must respond within 2000ms |
| Bug Verification | `bug-verification.spec.ts` | 12 | Status filter inversion, tenant isolation in findOne, pagination offset, price truncation, priority validation, image productId validation |
| Edge Cases | `edge-cases.spec.ts` | 13 | Missing tenant header, delete cascading, pagination boundary values, default priority, cross-tenant image creation, duplicate names |

### Test Categories

- **Happy path** — Standard CRUD operations work as documented
- **Negative testing** — Invalid inputs rejected with appropriate errors
- **Security** — SQL injection, XSS, and javascript: protocol payloads handled safely
- **Data isolation** — Tenants cannot read, update, or delete each other's data
- **Contract testing** — GraphQL schema matches expected types, fields, and operations
- **Performance** — Response time assertions prevent regressions
- **Bug verification** — Each discovered bug has a dedicated reproduction test

---

## Architecture & Design Decisions

### GraphQL Client (`graphql-client.ts`)

A lightweight wrapper around native `fetch` that handles:
- JSON serialization/deserialization of GraphQL requests
- `x-tenant-id` header injection (defaults to `tenant-a`)
- Typed responses via generics (`gql<T>()`)

No external HTTP libraries (Axios, Supertest, etc.) — Node 20's native `fetch` keeps the dependency footprint minimal.

### Test Data Factory (`test-data-factory.ts`)

Uses the **builder pattern** for readable, flexible test data creation:

```typescript
const product = new ProductBuilder()
  .withName('Test Widget')
  .withPrice(49.99)
  .withStatus('INACTIVE')
  .build();
```

### Test Data Helpers

Helper functions (`createTestProduct`, `createTestImage`, `deleteTestProduct`, `deleteTestImage`) handle setup/teardown, so each test creates its own data and cleans up after itself — no test depends on seed data ordering.

### Global Setup (`global-setup.ts`)

Before any test runs, the global setup polls the API with a lightweight introspection query (`{ __typename }`). It retries up to 10 times with 2-second intervals. If the API isn't reachable after all retries, the suite fails with a clear error message instead of cryptic connection errors.

### Sequential Execution

Tests run with `--runInBand` to avoid race conditions. Since tests create and delete shared API state, parallel execution could cause flaky results.

---

## CI/CD Pipeline

The project includes a GitHub Actions pipeline (`.github/workflows/ci.yml`) that runs on every push and pull request. Full details are documented in [CI-CD.md](CI-CD.md).

### Pipeline stages

| Stage | What it does |
|-------|-------------|
| **Build** | Installs dependencies (`npm ci`) and compiles TypeScript (`tsc --noEmit`) to catch type errors |
| **Test** | Runs the full E2E test suite and uploads HTML/JUnit reports as artifacts (retained 14 days) |

### Running locally with `act`

Since the API lives in a separate repository, the CI pipeline can't spin it up on its own. To verify the full pipeline locally:

```bash
# 1. Start the API
docker-compose up --build && docker-compose run --rm seed

# 2. Simulate the GitHub Actions pipeline
act push
```

See [CI-CD.md](CI-CD.md) for the full `act` output from a successful run (all 139 tests passing).

---

## Bugs Discovered

Through this test suite, **9 bugs** were identified in the API. Full details with code references, reproduction steps, and suggested fixes are in [BUGS-FOUND.md](BUGS-FOUND.md).

### Summary

| # | Bug | Severity |
|---|-----|----------|
| 1 | Price stored as `int` — decimals silently truncated | Critical |
| 2 | Pagination offset uses `page * pageSize` instead of `(page - 1) * pageSize` | Medium |
| 3 | Priority validation inconsistency between create (`<= 0`) and update (`< 0`) | Medium |
| 4 | Priority error message says "between 0 and 1000" but code rejects 0 | Medium |
| 5 | Image create/update doesn't validate `productId` existence or tenant ownership | Medium |
| 6 | `page` and `pageSize` parameters not validated (accepts 0, negatives) | Medium |
| 7 | Negative `minPrice`/`maxPrice` filter values silently ignored | Low |
| 8 | Redundant tenant check in Image `findOne` + error message shows `tenantId` instead of `id` | Low |
| 9 | Product name regex rejects unicode, accented characters, currency symbols | Low |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3000/graphql` | GraphQL API endpoint. Override to point tests at a different environment. |

Set via shell:

```bash
API_URL=http://staging.example.com/graphql npm test
```

Or via GitHub repository variables for CI (Settings → Variables → `API_URL`).