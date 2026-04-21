import { gql, createTestProduct, deleteTestProduct } from '../helpers/graphql-client';

const MAX_RESPONSE_TIME_MS = 2000;

describe('Response Time', () => {
  /**
   * Basic performance gate tests.
   * Ensures API responses stay within acceptable thresholds.
   * These are not load tests — they verify single-request latency.
   */

  describe('Query performance', () => {
    it(`products list should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const start = Date.now();
      const { errors } = await gql(
        `query { products(pageSize: 10) { id name price status } }`,
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });

    it(`single product query should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const product = await createTestProduct();
      try {
        const start = Date.now();
        const { errors } = await gql(
          `query($id: Int!) { product(id: $id) { id name price status images { id url } } }`,
          { id: product.id },
        );
        const elapsed = Date.now() - start;

        expect(errors).toBeUndefined();
        expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
      } finally {
        await deleteTestProduct(product.id);
      }
    });

    it(`products with filters should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const start = Date.now();
      const { errors } = await gql(
        `query($filter: ProductFilterInput) {
          products(filter: $filter, pageSize: 50) { id name price status }
        }`,
        { filter: { status: 'ACTIVE', minPrice: 10, maxPrice: 100 } },
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });

    it(`images list should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const start = Date.now();
      const { errors } = await gql(
        `query { images { id url priority product { id name } } }`,
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
  });

  describe('Mutation performance', () => {
    it(`createProduct should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const start = Date.now();
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }`,
        { input: { name: `Perf Test ${Date.now()}`, price: 25 } },
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);

      // Cleanup
      if (data?.createProduct) {
        await deleteTestProduct(Number(data.createProduct.id));
      }
    });

    it(`updateProduct should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const product = await createTestProduct();
      try {
        const start = Date.now();
        const { errors } = await gql(
          `mutation($id: Int!, $input: UpdateProductInput!) {
            updateProduct(id: $id, input: $input) { id name }
          }`,
          { id: product.id, input: { name: 'Updated Perf Test', price: 30 } },
        );
        const elapsed = Date.now() - start;

        expect(errors).toBeUndefined();
        expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
      } finally {
        await deleteTestProduct(product.id);
      }
    });

    it(`deleteProduct should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const product = await createTestProduct();

      const start = Date.now();
      const { errors } = await gql(
        `mutation($id: Int!) { deleteProduct(id: $id) }`,
        { id: product.id },
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
  });

  describe('Introspection performance', () => {
    it(`schema introspection should respond within ${MAX_RESPONSE_TIME_MS}ms`, async () => {
      const start = Date.now();
      const { errors } = await gql(
        `query { __schema { types { name } } }`,
      );
      const elapsed = Date.now() - start;

      expect(errors).toBeUndefined();
      expect(elapsed).toBeLessThan(MAX_RESPONSE_TIME_MS);
    });
  });
});