import { gql, createTestProduct, deleteTestProduct } from '../helpers/graphql-client';

describe('Product Filtering & Pagination', () => {
  /**
   * These tests use seed data from tenant-a which has:
   * - 8 ACTIVE products (prices: $9.99 - $89.99)
   * - 4 INACTIVE products (prices: $15.99 - $79.99)
   * - 12 products total
   *
   * We also create some test products to ensure deterministic results.
   */

  const testProductIds: number[] = [];

  beforeAll(async () => {
    // Create products with known values for deterministic filter testing
    const products = [
      { name: 'Filter Test Alpha', price: 100.0, status: 'ACTIVE' },
      { name: 'Filter Test Beta', price: 200.0, status: 'ACTIVE' },
      { name: 'Filter Test Gamma', price: 300.0, status: 'INACTIVE' },
    ];

    for (const p of products) {
      const created = await createTestProduct('tenant-a', p);
      testProductIds.push(created.id);
    }
  });

  afterAll(async () => {
    for (const id of testProductIds) {
      await deleteTestProduct(id, 'tenant-a');
    }
  });

  describe('Status Filter', () => {
    it('should return only ACTIVE products when filtering by ACTIVE status', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name status }
        }`,
        { filter: { status: 'ACTIVE' } },
      );

      expect(errors).toBeUndefined();
      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.status).toBe('ACTIVE');
      }
    });

    it('should return only INACTIVE products when filtering by INACTIVE status', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name status }
        }`,
        { filter: { status: 'INACTIVE' } },
      );

      expect(errors).toBeUndefined();
      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.status).toBe('INACTIVE');
      }
    });
  });

  describe('Name Filter', () => {
    it('should filter products by partial name match (case-insensitive)', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name }
        }`,
        { filter: { name: 'filter test' } },
      );

      expect(data!.products.length).toBeGreaterThanOrEqual(3);
      for (const product of data!.products) {
        expect(product.name.toLowerCase()).toContain('filter test');
      }
    });

    it('should return empty list when name filter matches nothing', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter) { id name }
        }`,
        { filter: { name: 'xyznonexistent999' } },
      );

      expect(data!.products).toHaveLength(0);
    });
  });

  describe('Price Filter', () => {
    it('should filter products with minPrice', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name price }
        }`,
        { filter: { minPrice: 200.0 } },
      );

      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.price).toBeGreaterThanOrEqual(200.0);
      }
    });

    it('should filter products with maxPrice', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name price }
        }`,
        { filter: { maxPrice: 100.0 } },
      );

      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.price).toBeLessThanOrEqual(100.0);
      }
    });

    it('should filter products within a price range', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name price }
        }`,
        { filter: { minPrice: 100.0, maxPrice: 200.0 } },
      );

      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.price).toBeGreaterThanOrEqual(100.0);
        expect(product.price).toBeLessThanOrEqual(200.0);
      }
    });
  });

  describe('Combined Filters', () => {
    it('should combine status and name filters', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name status }
        }`,
        { filter: { status: 'ACTIVE', name: 'Filter Test' } },
      );

      for (const product of data!.products) {
        expect(product.status).toBe('ACTIVE');
        expect(product.name.toLowerCase()).toContain('filter test');
      }
    });

    it('should combine status and price filters', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name status price }
        }`,
        { filter: { status: 'ACTIVE', minPrice: 150 } },
      );

      for (const product of data!.products) {
        expect(product.status).toBe('ACTIVE');
        expect(product.price).toBeGreaterThanOrEqual(150);
      }
    });
  });

  describe('Pagination', () => {
    it('should return at most pageSize results', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(pageSize: 3) { id } }`,
      );

      expect(data!.products.length).toBeLessThanOrEqual(3);
    });

    it('should return the first page of results by default (page 1)', async () => {
      const { data: page1 } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 5) { id name } }`,
      );

      expect(page1!.products.length).toBeGreaterThan(0);
      expect(page1!.products.length).toBeLessThanOrEqual(5);
    });

    it('should return different results for different pages', async () => {
      const { data: page1 } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 3) { id } }`,
      );
      const { data: page2 } = await gql<{ products: any[] }>(
        `query { products(page: 2, pageSize: 3) { id } }`,
      );

      // Page 1 and page 2 should have no overlapping IDs
      const page1Ids = page1!.products.map((p: any) => p.id);
      const page2Ids = page2!.products.map((p: any) => p.id);

      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });

    it('should return all products across pages without missing any', async () => {
      // Get total count with a large page size
      const { data: all } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id } }`,
      );
      const totalCount = all!.products.length;

      // Paginate through with pageSize 5
      const allPaginatedIds: string[] = [];
      let page = 1;
      while (true) {
        const { data } = await gql<{ products: any[] }>(
          `query($page: Int) { products(page: $page, pageSize: 5) { id } }`,
          { page },
        );
        if (data!.products.length === 0) break;
        allPaginatedIds.push(...data!.products.map((p: any) => p.id));
        if (data!.products.length < 5) break;
        page++;
      }

      expect(allPaginatedIds.length).toBe(totalCount);
    });

    it('should default to page 1 and pageSize 10', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products { id } }`,
      );

      expect(data!.products.length).toBeLessThanOrEqual(10);
    });
  });
});
