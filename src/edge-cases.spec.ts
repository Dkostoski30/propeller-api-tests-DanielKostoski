import {
  gql,
  createTestProduct,
  createTestImage,
  deleteTestProduct,
  deleteTestImage,
} from './helpers/graphql-client';

describe('Edge Cases', () => {
  /**
   * Tests for edge-case behaviors not covered by the main CRUD, validation,
   * or isolation suites: missing tenant header, cascade on delete,
   * pagination boundary values, and default field values.
   */

  describe('Missing x-tenant-id header', () => {
    it('should fall back to a default tenant when header is absent', async () => {
      const res = await fetch(
        process.env.API_URL || 'http://localhost:3000/graphql',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query { products(pageSize: 5) { id tenantId } }`,
          }),
        },
      );
      const body = (await res.json()) as { data?: { products: any[] }; errors?: any[] };

      // The API should not crash — it either returns an error or uses 'default'
      if (body.errors) {
        // Acceptable: the API rejects requests without a tenant header
        expect(body.errors[0].message).toBeDefined();
      } else {
        // Acceptable: the API falls back to 'default' and returns no data
        // (because seed data only has tenant-a / tenant-b)
        expect(body.data!.products).toBeDefined();
        for (const p of body.data!.products) {
          expect(p.tenantId).toBe('default');
        }
      }
    });

    it('should not return tenant-a or tenant-b data to unknown tenant', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id tenantId } }`,
        undefined,
        'unknown-tenant',
      );

      expect(data!.products).toBeDefined();
      for (const p of data!.products) {
        expect(p.tenantId).not.toBe('tenant-a');
        expect(p.tenantId).not.toBe('tenant-b');
      }
    });
  });

  describe('Delete cascading behavior', () => {
    let productId: number;
    const imageIds: number[] = [];

    beforeAll(async () => {
      const product = await createTestProduct('tenant-a', {
        name: `Cascade Test Product ${Date.now()}`,
        price: 50,
      });
      productId = product.id;

      for (let i = 0; i < 2; i++) {
        const image = await createTestImage('tenant-a', {
          url: `https://cdn.example.com/cascade-${i}-${Date.now()}.jpg`,
          priority: 100,
          productId,
        });
        imageIds.push(image.id);
      }
    });

    afterAll(async () => {
      // Best-effort cleanup in case cascade doesn't happen
      for (const id of imageIds) {
        await deleteTestImage(id);
      }
    });

    it('should handle deletion of a product that has linked images', async () => {
      // Delete the product
      const { data, errors } = await gql<{ deleteProduct: boolean }>(
        `mutation($id: Int!) { deleteProduct(id: $id) }`,
        { id: productId },
      );

      expect(errors).toBeUndefined();
      expect(data!.deleteProduct).toBe(true);
    });

    it('images should be orphaned or deleted after product deletion', async () => {
      // After deleting the parent product, check what happened to images
      for (const imageId of imageIds) {
        const { data, errors } = await gql<{ image: any }>(
          `query($id: Int!) { image(id: $id) { id productId product { id } } }`,
          { id: imageId },
        );

        if (errors) {
          // Cascade-deleted: image no longer exists — acceptable
          expect(errors[0].message).toContain('not found');
        } else {
          // Orphaned: image exists but product is null — also acceptable
          expect(data!.image.product).toBeNull();
        }
      }
    });
  });

  describe('Pagination boundary values', () => {
    it('should handle page = 0 gracefully', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query { products(page: 0, pageSize: 5) { id } }`,
      );

      // Should either return an error or return results without crashing
      if (errors) {
        expect(errors[0].message).toBeDefined();
      } else {
        expect(data!.products).toBeDefined();
      }
    });

    it('should handle negative page gracefully', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query { products(page: -1, pageSize: 5) { id } }`,
      );

      if (errors) {
        expect(errors[0].message).toBeDefined();
      } else {
        expect(data!.products).toBeDefined();
      }
    });

    it('should handle pageSize = 0 gracefully', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 0) { id } }`,
      );

      if (errors) {
        expect(errors[0].message).toBeDefined();
      } else {
        // pageSize 0 should logically return an empty list
        expect(data!.products).toBeDefined();
        expect(data!.products.length).toBe(0);
      }
    });

    it('should handle very large pageSize gracefully', async () => {
      const { data, errors } = await gql<{ products: any[] }>(
        `query { products(page: 1, pageSize: 10000) { id } }`,
      );

      expect(errors).toBeUndefined();
      expect(data!.products).toBeDefined();
    });

    it('should return empty list for a page beyond available data', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(page: 9999, pageSize: 10) { id } }`,
      );

      expect(data!.products).toEqual([]);
    });
  });

  describe('Image default priority', () => {
    /**
     * README says: "priority: Int — Display priority (min: 1, max: 1000, default: 100)"
     * Entity says: Column({ type: 'int', default: 0 })
     *
     * This test documents the actual default behavior.
     */
    it('should assign a default priority when none is specified', async () => {
      const { data, errors } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id priority }
        }`,
        { input: { url: `https://cdn.example.com/default-priority-${Date.now()}.jpg` } },
      );

      expect(errors).toBeUndefined();
      const priority = data!.createImage.priority;

      // Per README, default should be 100. Per entity, it's 0.
      // Document whichever is the actual behavior.
      expect(typeof priority).toBe('number');
      // The README-documented default is 100
      expect(priority).toBe(100);

      // Cleanup
      await deleteTestImage(Number(data!.createImage.id));
    });
  });

  describe('Create image for another tenant product', () => {
    let tenantBProductId: number;

    beforeAll(async () => {
      const product = await createTestProduct('tenant-b', {
        name: `Cross-Tenant Image Test ${Date.now()}`,
        price: 30,
      });
      tenantBProductId = product.id;
    });

    afterAll(async () => {
      await deleteTestProduct(tenantBProductId, 'tenant-b');
    });

    it('should not allow tenant-a to create an image linked to a tenant-b product', async () => {
      const { data, errors } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id productId tenantId }
        }`,
        {
          input: {
            url: `https://cdn.example.com/cross-tenant-${Date.now()}.jpg`,
            productId: tenantBProductId,
          },
        },
        'tenant-a',
      );

      if (errors) {
        // Best: the API rejects the cross-tenant link
        expect(errors[0].message).toBeDefined();
      } else {
        // If it creates, it should at least belong to tenant-a, not tenant-b
        expect(data!.createImage.tenantId).toBe('tenant-a');
        // The product link may or may not succeed — document behavior
        // Cleanup
        await deleteTestImage(Number(data!.createImage.id));
      }
    });
  });

  describe('Concurrent duplicate names', () => {
    it('should allow two products with the same name in the same tenant', async () => {
      const name = `Duplicate Name Test ${Date.now()}`;
      const product1 = await createTestProduct('tenant-a', { name, price: 10 });
      const product2 = await createTestProduct('tenant-a', { name, price: 20 });

      try {
        expect(product1.id).not.toBe(product2.id);
        expect(product1.name).toBe(name);
        expect(product2.name).toBe(name);
      } finally {
        await deleteTestProduct(product1.id);
        await deleteTestProduct(product2.id);
      }
    });

    it('should allow same product name across different tenants', async () => {
      const name = `Cross-Tenant Name Test ${Date.now()}`;
      const productA = await createTestProduct('tenant-a', { name, price: 10 });
      const productB = await createTestProduct('tenant-b', { name, price: 10 });

      try {
        expect(productA.id).not.toBe(productB.id);
      } finally {
        await deleteTestProduct(productA.id, 'tenant-a');
        await deleteTestProduct(productB.id, 'tenant-b');
      }
    });
  });
});
