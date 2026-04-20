import { gql, createTestProduct, deleteTestProduct } from '../helpers/graphql-client';

describe('Product Queries', () => {
  describe('products (list)', () => {
    it('should return a list of products for the requesting tenant', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query {
          products {
            id name price status tenantId
          }
        }`,
      );

      expect(errors).toBeUndefined();
      expect(data!.products).toBeDefined();
      expect(Array.isArray(data!.products)).toBe(true);
      expect(data!.products.length).toBeGreaterThan(0);
    });

    it('should only return products belonging to tenant-a', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products { id tenantId } }`,
        undefined,
        'tenant-a',
      );

      for (const product of data!.products) {
        expect(product.tenantId).toBe('tenant-a');
      }
    });

    it('should only return products belonging to tenant-b', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products { id tenantId } }`,
        undefined,
        'tenant-b',
      );

      expect(data!.products.length).toBeGreaterThan(0);
      for (const product of data!.products) {
        expect(product.tenantId).toBe('tenant-b');
      }
    });

    it('should include images relation in product results', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query {
          products {
            id name
            images { id url priority }
          }
        }`,
      );

      expect(data!.products).toBeDefined();
      // Every product should have an images array (even if empty)
      for (const product of data!.products) {
        expect(Array.isArray(product.images)).toBe(true);
      }
    });

    it('should return product fields with correct types', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products { id name price status tenantId } }`,
      );

      const product = data!.products[0];
      expect(product.id).toBeDefined();
      expect(typeof product.name).toBe('string');
      expect(typeof product.price).toBe('number');
      expect(['ACTIVE', 'INACTIVE']).toContain(product.status);
      expect(typeof product.tenantId).toBe('string');
    });
  });

  describe('product (single by ID)', () => {
    let testProductId: number;

    beforeAll(async () => {
      const product = await createTestProduct('tenant-a', { name: 'Query Test Product' });
      testProductId = product.id;
    });

    afterAll(async () => {
      await deleteTestProduct(testProductId, 'tenant-a');
    });

    it('should return a single product by ID', async () => {
      const { data, errors } = await gql<{ product: any }>(
        `query($id: Int!) {
          product(id: $id) { id name price status tenantId }
        }`,
        { id: testProductId },
      );

      expect(errors).toBeUndefined();
      expect(data!.product).toBeDefined();
      expect(Number(data!.product.id)).toBe(testProductId);
      expect(data!.product.name).toBe('Query Test Product');
    });

    it('should return error for non-existent product ID', async () => {
      const { errors } = await gql(
        `query { product(id: 999999) { id name } }`,
      );

      expect(errors).toBeDefined();
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors![0].message).toContain('not found');
    });

    it('should include images when querying a single product', async () => {
      const { data } = await gql<{ product: any }>(
        `query($id: Int!) {
          product(id: $id) { id images { id url priority } }
        }`,
        { id: testProductId },
      );

      expect(data!.product).toBeDefined();
      expect(Array.isArray(data!.product.images)).toBe(true);
    });
  });
});
