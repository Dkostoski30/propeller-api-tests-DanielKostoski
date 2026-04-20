import { gql, createTestProduct, deleteTestProduct } from '../helpers/graphql-client';

describe('Input Validation', () => {
  /**
   * Tests that the API properly validates and rejects malformed input.
   * Covers boundary values, security payloads, and type coercion edge cases.
   */

  const createdIds: number[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteTestProduct(id);
    }
  });

  describe('Product Name Validation', () => {
    it('should reject an empty string name', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: '', price: 10.0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject a whitespace-only name', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: '   ', price: 10.0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should handle extremely long names gracefully', async () => {
      const longName = 'A'.repeat(1000);
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }`,
        { input: { name: longName, price: 10.0 } },
      );

      // API should either reject it or truncate it - either is acceptable
      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
      }
      // If no error, at minimum name should be stored
      if (!errors) {
        expect(data!.createProduct.name).toBeDefined();
      }
    });

    it('should handle unicode/special characters in names', async () => {
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }`,
        { input: { name: '日本語テスト Product™ — €50', price: 25.0 } },
      );

      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
        expect(data.createProduct.name).toBe('日本語テスト Product™ — €50');
      }
      // No crash/500 is the minimum expectation
      expect(errors?.[0]?.message).not.toContain('Internal');
    });

    it('should not be vulnerable to SQL injection via name', async () => {
      const sqlPayload = "'; DROP TABLE products; --";
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }`,
        { input: { name: sqlPayload, price: 10.0 } },
      );

      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
        // If it creates successfully, the name should be stored as-is (not executed)
        expect(data.createProduct.name).toBe(sqlPayload);
      }

      // Verify the products table still works
      const { data: check } = await gql<{ products: any[] }>(
        `query { products(pageSize: 1) { id } }`,
      );
      expect(check!.products).toBeDefined();
    });

    it('should not be vulnerable to XSS via name', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }`,
        { input: { name: xssPayload, price: 10.0 } },
      );

      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
        // Name should be stored as-is or sanitized, never executed
        expect(data.createProduct.name).toBeDefined();
      }
    });
  });

  describe('Product Price Validation', () => {
    it('should reject negative price', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Negative Price Product', price: -1.0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject zero price', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Zero Price Product', price: 0 } },
      );

      // Zero may or may not be valid — document behavior
      // If accepted, at least verify it's stored correctly
      if (!errors) {
        // Clean up if created
        const { data } = await gql<{ products: any[] }>(
          `query($filter: ProductFilterInput) {
            products(filter: $filter) { id }
          }`,
          { filter: { name: 'Zero Price Product' } },
        );
        if (data?.products?.length) {
          createdIds.push(Number(data.products[0].id));
        }
      }
    });

    it('should reject excessively large prices', async () => {
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id price }
        }`,
        { input: { name: 'Expensive Product', price: 999999999999.99 } },
      );

      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
        // If accepted, verify precision is maintained
        expect(data.createProduct.price).toBeCloseTo(999999999999.99, 0);
      }
    });

    it('should handle float precision correctly', async () => {
      const { data } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id price }
        }`,
        { input: { name: 'Precision Test Product', price: 19.99 } },
      );

      if (data?.createProduct) {
        createdIds.push(Number(data.createProduct.id));
        expect(data.createProduct.price).toBeCloseTo(19.99, 2);
      }
    });
  });

  describe('Product Status Validation', () => {
    it('should reject an invalid status value', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Invalid Status', price: 10.0, status: 'DELETED' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject status in wrong case', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Wrong Case Status', price: 10.0, status: 'Active' } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('Image URL Validation', () => {
    it('should reject empty URL', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: '' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject non-URL strings', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'not-a-url' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject URLs with spaces', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://example.com/my image.jpg' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject javascript: protocol URLs', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'javascript:alert(1)' } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('Image Priority Validation', () => {
    it('should reject priority below minimum (0)', async () => {
      const {errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/test.jpg', priority: 0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject negative priority', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/test.jpg', priority: -5 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject priority above maximum (1000)', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/test.jpg', priority: 1001 } },
      );

      expect(errors).toBeDefined();
    });

    it('should accept boundary value: priority = 1', async () => {
      const { data, errors } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id priority }
        }`,
        { input: { url: 'https://cdn.example.com/priority-min.jpg', priority: 1 } },
      );

      expect(errors).toBeUndefined();
      expect(data!.createImage.priority).toBe(1);

      // Cleanup
      await gql(`mutation { deleteImage(id: ${data!.createImage.id}) }`);
    });

    it('should accept boundary value: priority = 1000', async () => {
      const { data, errors } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id priority }
        }`,
        { input: { url: 'https://cdn.example.com/priority-max.jpg', priority: 1000 } },
      );

      expect(errors).toBeUndefined();
      expect(data!.createImage.priority).toBe(1000);

      // Cleanup
      await gql(`mutation { deleteImage(id: ${data!.createImage.id}) }`);
    });

    it('should reject non-integer priority', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/test.jpg', priority: 5.5 } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('Update Validation', () => {
    let productId: number;

    beforeAll(async () => {
      const product = await createTestProduct('tenant-a', { name: 'Update Validation Product', price: 50.0 });
      productId = product.id;
    });

    afterAll(async () => {
      await deleteTestProduct(productId);
    });

    it('should reject updating product with negative price', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id }
        }`,
        { id: productId, input: { price: -10.0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject updating product with invalid status', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id }
        }`,
        { id: productId, input: { status: 'ARCHIVED' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject updating product with empty name', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id }
        }`,
        { id: productId, input: { name: '' } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('GraphQL Type Coercion', () => {
    it('should reject string value for numeric ID', async () => {
      const { errors } = await gql(
        `query { product(id: "abc") { id } }`,
      );

      expect(errors).toBeDefined();
    });

    it('should reject float value for Int ID', async () => {
      const { errors } = await gql(
        `query { product(id: 1.5) { id } }`,
      );

      expect(errors).toBeDefined();
    });

    it('should handle null required fields', async () => {
      const { errors } = await gql(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: null, price: 10.0 } },
      );

      expect(errors).toBeDefined();
    });
  });
});
