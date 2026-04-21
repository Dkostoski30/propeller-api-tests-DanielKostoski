# CI/CD Pipeline

## Overview

The project uses GitHub Actions to automatically build and test on every commit. The pipeline is defined in `.github/workflows/ci.yml`.

## Pipeline Stages

### 1. Build

- Checks out the repository
- Installs Node.js 20
- Installs dependencies (`npm ci`)
- Compiles TypeScript (`tsc --noEmit`) to catch type errors

### 2. Test

- Installs dependencies
- Waits for the GraphQL API to become healthy at `API_URL` (default: `http://localhost:3000/graphql`)
- Runs the full E2E test suite (`npm test`)
- Uploads HTML and JUnit test reports as build artifacts (retained for 14 days)

## Triggers

- **Push** to any branch
- **Pull request** to any branch

## Configuration

| Variable  | Where to set                          | Default                        | Description           |
|-----------|---------------------------------------|--------------------------------|-----------------------|
| `API_URL` | GitHub repo settings > Variables      | `http://localhost:3000/graphql` | GraphQL API endpoint  |

## Health Check

Before running tests, the `global-setup.ts` script polls the API with up to 10 retries (2s apart). If the API is not reachable after all retries, the pipeline fails with a clear error message.

## Running Locally

### Why simulate?

The CI pipeline expects the API to be running at `API_URL`. Since the API lives in a separate private repository (`propeller-commerce/propeller-sdet-task-daniel-kostoski`), the pipeline cannot clone and spin it up on its own without a cross-repo access token. To verify the full pipeline works end-to-end, we use [act](https://github.com/nektos/act) to simulate GitHub Actions locally with the API running on `localhost:3000`.

### How to simulate

1. Start the API locally (from the API project directory):

```bash
docker-compose up --build
docker-compose run --rm seed
```

2. Run the pipeline simulation:

```bash
act push
```

### Successful run output

```
$ act push
time="2026-04-21T11:21:38+02:00" level=info msg="Using docker host 'npipe:////./pipe/docker_engine', and daemon socket 'npipe:////./pipe/docker_engine'"
[E2E Tests/Build] ⭐ Run Set up job
[E2E Tests/Build] 🚀  Start image=catthehacker/ubuntu:act-latest
[E2E Tests/Build]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[E2E Tests/Build] using DockerAuthConfig authentication for docker pull
[E2E Tests/Build]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[E2E Tests/Build]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[E2E Tests/Build]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[E2E Tests/Build]   ✅  Success - Set up job
[E2E Tests/Build]   ☁  git clone 'https://github.com/actions/setup-node' # ref=v4
[E2E Tests/Build] ⭐ Run Main actions/checkout@v4
[E2E Tests/Build]   🐳  docker cp src=C:\Users\kosto\Desktop\propeller-api-e2e-tests\. dst=/mnt/c/Users/kosto/Desktop/propeller-api-e2e-tests
[E2E Tests/Build]   ✅  Success - Main actions/checkout@v4 [6.2156865s]
[E2E Tests/Build] ⭐ Run Main actions/setup-node@v4
[E2E Tests/Build]   🐳  docker cp src=C:\Users\kosto\.cache\act/actions-setup-node@v4/ dst=/var/run/act/actions/actions-setup-node@v4/
[E2E Tests/Build]   🐳  docker exec cmd=[/opt/acttoolcache/node/24.14.1/x64/bin/node /var/run/act/actions/actions-setup-node@v4/dist/setup/index.js] user= workdir=
| Attempting to download 20...
| Acquiring 20.20.2 - x64 from https://github.com/actions/node-versions/releases/download/20.20.2-23521894959/node-20.20.2-linux-x64.tar.gz
| Extracting ...
| Adding to the cache ...
[E2E Tests/Build]   ✅  Success - Main actions/setup-node@v4 [50.249959s]
[E2E Tests/Build] ⭐ Run Main Install dependencies
[E2E Tests/Build]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/2] user= workdir=
| added 306 packages, and audited 307 packages in 7s
| found 0 vulnerabilities
[E2E Tests/Build]   ✅  Success - Main Install dependencies [7.3914128s]
[E2E Tests/Build] ⭐ Run Main Compile TypeScript
[E2E Tests/Build]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/3] user= workdir=
| > propeller-api-e2e-tests@1.0.0 build
| > tsc --noEmit
[E2E Tests/Build]   ✅  Success - Main Compile TypeScript [2.314067s]
[E2E Tests/Build]   ✅  Success - Post actions/setup-node@v4 [1.0530344s]
[E2E Tests/Build]   ✅  Success - Complete job
[E2E Tests/Build] 🏁  Job succeeded

[E2E Tests/Test ] ⭐ Run Set up job
[E2E Tests/Test ] 🚀  Start image=catthehacker/ubuntu:act-latest
[E2E Tests/Test ]   🐳  docker pull image=catthehacker/ubuntu:act-latest platform= username= forcePull=true
[E2E Tests/Test ] using DockerAuthConfig authentication for docker pull
[E2E Tests/Test ]   🐳  docker create image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[E2E Tests/Test ]   🐳  docker run image=catthehacker/ubuntu:act-latest platform= entrypoint=["tail" "-f" "/dev/null"] cmd=[] network="host"
[E2E Tests/Test ]   🐳  docker exec cmd=[node --no-warnings -e console.log(process.execPath)] user= workdir=
[E2E Tests/Test ]   ✅  Success - Set up job
[E2E Tests/Test ]   ☁  git clone 'https://github.com/actions/setup-node' # ref=v4
[E2E Tests/Test ]   ☁  git clone 'https://github.com/actions/upload-artifact' # ref=v4
[E2E Tests/Test ] ⭐ Run Main actions/checkout@v4
[E2E Tests/Test ]   ✅  Success - Main actions/checkout@v4 [153.1038ms]
[E2E Tests/Test ] ⭐ Run Main actions/setup-node@v4
[E2E Tests/Test ]   ✅  Success - Main actions/setup-node@v4 [7.1791123s]
[E2E Tests/Test ] ⭐ Run Main Install dependencies
[E2E Tests/Test ]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/2] user= workdir=
| added 306 packages, and audited 307 packages in 4s
| found 0 vulnerabilities
[E2E Tests/Test ]   ✅  Success - Main Install dependencies [4.440336s]
[E2E Tests/Test ] ⭐ Run Main Run E2E tests
[E2E Tests/Test ]   🐳  docker exec cmd=[bash -e /var/run/act/workflow/3] user= workdir=
| > propeller-api-e2e-tests@1.0.0 test
| > jest --verbose --runInBand
|
| ✓ API is reachable at http://localhost:3000/graphql
|  PASS  src/validation/input-validation.spec.ts
|       ✓ should reject an empty string name (37 ms)
|       ✓ should reject a whitespace-only name (8 ms)
|       ✓ should handle extremely long names gracefully (78 ms)
|       ✓ should handle unicode/special characters in names (6 ms)
|       ✓ should not be vulnerable to SQL injection via name (42 ms)
|       ✓ should not be vulnerable to XSS via name (5 ms)
|       ✓ should reject negative price (8 ms)
|       ✓ should reject zero price (25 ms)
|       ✓ should reject excessively large prices (16 ms)
|       ✓ should handle float precision correctly (8 ms)
|       ✓ should reject an invalid status value (7 ms)
|       ✓ should reject status in wrong case (5 ms)
|       ✓ should reject empty URL (6 ms)
|       ✓ should reject non-URL strings (5 ms)
|       ✓ should reject URLs with spaces (5 ms)
|       ✓ should reject javascript: protocol URLs (5 ms)
|       ✓ should reject priority below minimum (0) (5 ms)
|       ✓ should reject negative priority (5 ms)
|       ✓ should reject priority above maximum (1000) (5 ms)
|       ✓ should accept boundary value: priority = 1 (39 ms)
|       ✓ should accept boundary value: priority = 1000 (22 ms)
|       ✓ should reject non-integer priority (4 ms)
|       ✓ should reject updating product with negative price (5 ms)
|       ✓ should reject updating product with invalid status (3 ms)
|       ✓ should reject updating product with empty name (4 ms)
|       ✓ should reject string value for numeric ID (7 ms)
|       ✓ should reject float value for Int ID (6 ms)
|       ✓ should handle null required fields (4 ms)
|
|  PASS  src/products/product-filters-pagination.spec.ts
|       ✓ should return only ACTIVE products when filtering by ACTIVE status (14 ms)
|       ✓ should return only INACTIVE products when filtering by INACTIVE status (9 ms)
|       ✓ should filter products by partial name match (case-insensitive) (8 ms)
|       ✓ should return empty list when name filter matches nothing (7 ms)
|       ✓ should filter products with minPrice (9 ms)
|       ✓ should filter products with maxPrice (8 ms)
|       ✓ should filter products within a price range (8 ms)
|       ✓ should combine status and name filters (7 ms)
|       ✓ should combine status and price filters (9 ms)
|       ✓ should return at most pageSize results (9 ms)
|       ✓ should return the first page of results by default (page 1) (8 ms)
|       ✓ should return different results for different pages (16 ms)
|       ✓ should return all products across pages without missing any (35 ms)
|       ✓ should default to page 1 and pageSize 10 (8 ms)
|
|  PASS  src/images/image-mutations.spec.ts
|       ✓ should create an image with a valid URL (12 ms)
|       ✓ should create an image with a custom priority (9 ms)
|       ✓ should create an image linked to a product (16 ms)
|       ✓ should create an orphan image (no productId) (7 ms)
|       ✓ should assign the image to the requesting tenant (8 ms)
|       ✓ should reject creation with an invalid URL (3 ms)
|       ✓ should reject creation without a URL (4 ms)
|       ✓ should reject priority below minimum (1) (3 ms)
|       ✓ should reject priority above maximum (1000) (3 ms)
|       ✓ should update the image URL (23 ms)
|       ✓ should update the image priority (16 ms)
|       ✓ should return error when updating a non-existent image (8 ms)
|       ✓ should reject update with an invalid URL (4 ms)
|       ✓ should delete an existing image (29 ms)
|       ✓ should return error when deleting a non-existent image (7 ms)
|
|  PASS  src/bugs/bug-verification.spec.ts
|       ✓ filtering by ACTIVE should include a known ACTIVE product (9 ms)
|       ✓ filtering by ACTIVE should NOT include a known INACTIVE product (7 ms)
|       ✓ filtering by INACTIVE should include a known INACTIVE product (7 ms)
|       ✓ tenant-a should NOT be able to retrieve tenant-b product by ID (6 ms)
|       ✓ tenant-b should still be able to retrieve its own product (6 ms)
|       ✓ page 1 should return results (not an empty/skipped set) (12 ms)
|       ✓ page 1 results should match the beginning of the full list (13 ms)
|       ✓ paginating through all pages should yield the same total as fetching all at once (39 ms)
|
|  PASS  src/tenant-isolation.spec.ts
|       ✓ tenant-a product list should not contain tenant-b products (8 ms)
|       ✓ tenant-b product list should not contain tenant-a products (6 ms)
|       ✓ tenant-a should NOT be able to fetch tenant-b product by ID (7 ms)
|       ✓ tenant-b should NOT be able to fetch tenant-a product by ID (5 ms)
|       ✓ tenant-a should NOT be able to update tenant-b product (8 ms)
|       ✓ tenant-a should NOT be able to delete tenant-b product (13 ms)
|       ✓ tenant-a image list should not contain tenant-b images (6 ms)
|       ✓ tenant-b image list should not contain tenant-a images (6 ms)
|       ✓ tenant-a should NOT be able to fetch tenant-b image by ID (6 ms)
|       ✓ tenant-a should NOT be able to update tenant-b image (5 ms)
|       ✓ tenant-a should NOT be able to delete tenant-b image (11 ms)
|
|  PASS  src/schema/schema-contract.spec.ts
|       ✓ should expose a Query type (1 ms)
|       ✓ should expose a Mutation type (1 ms)
|       ✓ should have a Product type (1 ms)
|       ✓ should have required fields: id, name, price, status, tenantId, images (1 ms)
|       ✓ should have an Image type
|       ✓ should have required fields: id, url, priority, tenantId, productId, product (1 ms)
|       ✓ should have a ProductStatus enum
|       ✓ should have ACTIVE and INACTIVE values
|       ✓ should expose products query (1 ms)
|       ✓ should expose product query
|       ✓ should expose images query
|       ✓ should expose image query (1 ms)
|       ✓ should expose createProduct mutation
|       ✓ should expose updateProduct mutation (1 ms)
|       ✓ should expose deleteProduct mutation
|       ✓ should expose createImage mutation (1 ms)
|       ✓ should expose updateImage mutation
|       ✓ should expose deleteImage mutation
|       ✓ should have CreateProductInput with name, price, status fields
|       ✓ should have CreateImageInput with url, priority, productId fields (1 ms)
|       ✓ should have ProductFilterInput with name, status, minPrice, maxPrice fields (1 ms)
|
|  PASS  src/products/product-mutations.spec.ts
|       ✓ should create a product with required fields (14 ms)
|       ✓ should create a product with explicit ACTIVE status (8 ms)
|       ✓ should create a product with INACTIVE status (8 ms)
|       ✓ should assign the product to the requesting tenant (8 ms)
|       ✓ should reject creation without a name (5 ms)
|       ✓ should reject creation without a price (4 ms)
|       ✓ should update the product name (13 ms)
|       ✓ should update the product price (13 ms)
|       ✓ should update the product status (13 ms)
|       ✓ should return error when updating a non-existent product (4 ms)
|       ✓ should delete an existing product (23 ms)
|       ✓ should return error when deleting a non-existent product (8 ms)
|
|  PASS  src/relationships.spec.ts
|       ✓ should return all linked images when querying a product (13 ms)
|       ✓ should return images with correct fields (13 ms)
|       ✓ should return empty images array for a product with no images (32 ms)
|       ✓ should return the parent product when querying an image (8 ms)
|       ✓ should return null product for an orphan image (25 ms)
|       ✓ should link an orphan image to a product via update (37 ms)
|       ✓ should include newly linked image in product images list (25 ms)
|       ✓ should return only images for a specific product when using productId filter (7 ms)
|
|  PASS  src/performance/response-time.spec.ts
|       ✓ products list should respond within 2000ms (12 ms)
|       ✓ single product query should respond within 2000ms (33 ms)
|       ✓ products with filters should respond within 2000ms (8 ms)
|       ✓ images list should respond within 2000ms (6 ms)
|       ✓ createProduct should respond within 2000ms (17 ms)
|       ✓ updateProduct should respond within 2000ms (32 ms)
|       ✓ deleteProduct should respond within 2000ms (16 ms)
|       ✓ schema introspection should respond within 2000ms (4 ms)
|
|  PASS  src/products/product-queries.spec.ts
|       ✓ should return a list of products for the requesting tenant (10 ms)
|       ✓ should only return products belonging to tenant-a (10 ms)
|       ✓ should only return products belonging to tenant-b (8 ms)
|       ✓ should include images relation in product results (9 ms)
|       ✓ should return product fields with correct types (8 ms)
|       ✓ should return a single product by ID (9 ms)
|       ✓ should return error for non-existent product ID (6 ms)
|       ✓ should include images when querying a single product (7 ms)
|
|  PASS  src/images/image-queries.spec.ts
|       ✓ should return a list of images for the requesting tenant (7 ms)
|       ✓ should only return images belonging to the requesting tenant (6 ms)
|       ✓ should filter images by productId (41 ms)
|       ✓ should include product relation in image results (7 ms)
|       ✓ should return a single image by ID (7 ms)
|       ✓ should return error for non-existent image ID (5 ms)
|
| Test Suites: 11 passed, 11 total
| Tests:       139 passed, 139 total
| Snapshots:   0 total
| Time:        3.441 s
| Ran all test suites.
[E2E Tests/Test ]   ✅  Success - Main Run E2E tests [6.8156127s]
[E2E Tests/Test ]   ✅  Success - Main Upload test reports [2.4607778s]
[E2E Tests/Test ]   ✅  Success - Post actions/setup-node@v4 [774.8702ms]
[E2E Tests/Test ]   ✅  Success - Complete job
[E2E Tests/Test ] 🏁  Job succeeded
```
