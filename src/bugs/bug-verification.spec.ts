import { gql, createTestProduct, deleteTestProduct } from '../helpers/graphql-client';

describe('Bug Verification', () => {
  /**
   * These tests explicitly document and verify the bugs found in the API.
   * Each test is named to clearly identify the bug it targets.
   * A failing test here proves the bug exists; passing means it's fixed.
   */

  describe('BUG: Status filter returns inverted results', () => {
    /**
     * Expected: filtering by status ACTIVE should return only ACTIVE products.
     * Actual (buggy): filtering by ACTIVE returns INACTIVE products and vice versa.
     *
     * Root cause: The status filter condition in product.service.ts is inverted.
     */

    let activeProductId: number;
    let inactiveProductId: number;

    beforeAll(async () => {
      const ACTIVE = await createTestProduct('tenant-a', {
        name: `BugTest ACTIVE ${Date.now()}`,
        price: 10.0,
        status: 'ACTIVE',
      });
      activeProductId = ACTIVE.id;

      const INACTIVE = await createTestProduct('tenant-a', {
        name: `BugTest INACTIVE ${Date.now()}`,
        price: 20.0,
        status: 'INACTIVE',
      });
      inactiveProductId = INACTIVE.id;
    });

    afterAll(async () => {
      await deleteTestProduct(activeProductId);
      await deleteTestProduct(inactiveProductId);
    });

    it('filtering by ACTIVE should include a known ACTIVE product', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 100) { id status }
        }`,
        { filter: { status: 'ACTIVE' } },
      );

      const ids = data!.products.map((p: any) => Number(p.id));
      expect(ids).toContain(activeProductId);
    });

    it('filtering by ACTIVE should NOT include a known INACTIVE product', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 100) { id status }
        }`,
        { filter: { status: 'ACTIVE' } },
      );

      const ids = data!.products.map((p: any) => Number(p.id));
      expect(ids).not.toContain(inactiveProductId);
    });

    it('filtering by INACTIVE should include a known INACTIVE product', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 100) { id status }
        }`,
        { filter: { status: 'INACTIVE' } },
      );

      const ids = data!.products.map((p: any) => Number(p.id));
      expect(ids).toContain(inactiveProductId);
    });
  });

  describe('BUG: Product findOne leaks data across tenants', () => {
    /**
     * Expected: querying a product by ID should only succeed if the product
     *           belongs to the requesting tenant.
     * Actual (buggy): any tenant can fetch any product by ID regardless of ownership.
     *
     * Root cause: product.service.ts findOne() does not include tenantId in the
     *             WHERE clause.
     */

    let tenantBProductId: number;

    beforeAll(async () => {
      const product = await createTestProduct('tenant-b', {
        name: `Cross-Tenant Leak Test ${Date.now()}`,
        price: 99.0,
      });
      tenantBProductId = product.id;
    });

    afterAll(async () => {
      await deleteTestProduct(tenantBProductId, 'tenant-b');
    });

    it('tenant-a should NOT be able to retrieve tenant-b product by ID', async () => {
      const { data, errors } = await gql<{ product: any }>(
        `query($id: Int!) { product(id: $id) { id name tenantId } }`,
        { id: tenantBProductId },
        'tenant-a',
      );

      // The correct behavior is to return null or an error
      if (errors) {
        expect(errors[0].message.toLowerCase()).toContain('not found');
      } else {
        expect(data!.product).toBeNull();
      }
    });

    it('tenant-b should still be able to retrieve its own product', async () => {
      const { data, errors } = await gql<{ product: any }>(
        `query($id: Int!) { product(id: $id) { id name tenantId } }`,
        { id: tenantBProductId },
        'tenant-b',
      );

      expect(errors).toBeUndefined();
      expect(data!.product).not.toBeNull();
      expect(data!.product.tenantId).toBe('tenant-b');
    });
  });

  describe('BUG: Pagination offset skips first page of results', () => {
    /**
     * Expected: page=1 with pageSize=N should return the first N results (offset 0).
     * Actual (buggy): page=1 skips N results because offset = page * pageSize
     *                 instead of (page - 1) * pageSize.
     *
     * Root cause: product.service.ts uses `qb.skip(page * pageSize)` instead of
     *             `qb.skip((page - 1) * pageSize)`.
     */

    const productIds: number[] = [];

    beforeAll(async () => {
      // Create enough products to test pagination
      for (let i = 0; i < 5; i++) {
        const p = await createTestProduct('tenant-a', {
          name: `Pagination Bug Test ${i} ${Date.now()}`,
          price: (i + 1) * 10,
        });
        productIds.push(p.id);
      }
    });

    afterAll(async () => {
      for (const id of productIds) {
        await deleteTestProduct(id);
      }
    });

    it('page 1 should return results (not an empty/skipped set)', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 5) { id } }`,
      );

      expect(data!.products.length).toBeGreaterThan(0);
    });

    it('page 1 results should match the beginning of the full list', async () => {
      // Get all products (no pagination)
      const { data: all } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id } }`,
      );

      // Get page 1 with pageSize 3
      const { data: page1 } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 3) { id } }`,
      );

      // Page 1 should be the first 3 items from the full list
      const expectedIds = all!.products.slice(0, 3).map((p: any) => p.id);
      const actualIds = page1!.products.map((p: any) => p.id);

      expect(actualIds).toEqual(expectedIds);
    });

    it('paginating through all pages should yield the same total as fetching all at once', async () => {
      const { data: all } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id } }`,
      );
      const totalCount = all!.products.length;

      const collectedIds: string[] = [];
      let page = 1;
      const pageSize = 4;

      while (collectedIds.length < totalCount && page <= 50) {
        const { data } = await gql<{ products: any[] }>(
          `query($page: Int, $pageSize: Int) {
            products(page: $page, pageSize: $pageSize) { id }
          }`,
          { page, pageSize },
        );

        if (!data!.products.length) break;
        collectedIds.push(...data!.products.map((p: any) => p.id));
        page++;
      }

      expect(collectedIds.length).toBe(totalCount);
      // Also verify no duplicates
      const uniqueIds = new Set(collectedIds);
      expect(uniqueIds.size).toBe(totalCount);
    });
  });
});
