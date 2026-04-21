import { gql } from '../helpers/graphql-client';

describe('GraphQL Schema Contract', () => {
  /**
   * These tests verify the API schema hasn't changed unexpectedly.
   * If the schema changes (fields removed/renamed, types altered),
   * these tests catch it before it reaches consumers.
   */

  let schema: any;

  beforeAll(async () => {
    const { data } = await gql<{ __schema: any }>(
      `query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          types {
            name
            kind
            fields { name type { name kind ofType { name kind } } }
            enumValues { name }
            inputFields { name type { name kind ofType { name kind } } }
          }
        }
      }`,
    );
    schema = data!.__schema;
  });

  describe('Root types', () => {
    it('should expose a Query type', () => {
      expect(schema.queryType.name).toBe('Query');
    });

    it('should expose a Mutation type', () => {
      expect(schema.mutationType.name).toBe('Mutation');
    });
  });

  describe('Product type contract', () => {
    let productType: any;

    beforeAll(() => {
      productType = schema.types.find((t: any) => t.name === 'Product');
    });

    it('should have a Product type', () => {
      expect(productType).toBeDefined();
      expect(productType.kind).toBe('OBJECT');
    });

    it('should have required fields: id, name, price, status, tenantId, images', () => {
      const fieldNames = productType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('price');
      expect(fieldNames).toContain('status');
      expect(fieldNames).toContain('tenantId');
      expect(fieldNames).toContain('images');
    });
  });

  describe('Image type contract', () => {
    let imageType: any;

    beforeAll(() => {
      imageType = schema.types.find((t: any) => t.name === 'Image');
    });

    it('should have an Image type', () => {
      expect(imageType).toBeDefined();
      expect(imageType.kind).toBe('OBJECT');
    });

    it('should have required fields: id, url, priority, tenantId, productId, product', () => {
      const fieldNames = imageType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('url');
      expect(fieldNames).toContain('priority');
      expect(fieldNames).toContain('tenantId');
      expect(fieldNames).toContain('productId');
      expect(fieldNames).toContain('product');
    });
  });

  describe('ProductStatus enum contract', () => {
    let statusEnum: any;

    beforeAll(() => {
      statusEnum = schema.types.find((t: any) => t.name === 'ProductStatus');
    });

    it('should have a ProductStatus enum', () => {
      expect(statusEnum).toBeDefined();
      expect(statusEnum.kind).toBe('ENUM');
    });

    it('should have ACTIVE and INACTIVE values', () => {
      const values = statusEnum.enumValues.map((v: any) => v.name);
      expect(values).toContain('ACTIVE');
      expect(values).toContain('INACTIVE');
    });
  });

  describe('Query operations contract', () => {
    let queryType: any;

    beforeAll(() => {
      queryType = schema.types.find((t: any) => t.name === 'Query');
    });

    it('should expose products query', () => {
      const fieldNames = queryType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('products');
    });

    it('should expose product query', () => {
      const fieldNames = queryType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('product');
    });

    it('should expose images query', () => {
      const fieldNames = queryType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('images');
    });

    it('should expose image query', () => {
      const fieldNames = queryType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('image');
    });
  });

  describe('Mutation operations contract', () => {
    let mutationType: any;

    beforeAll(() => {
      mutationType = schema.types.find((t: any) => t.name === 'Mutation');
    });

    it('should expose createProduct mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('createProduct');
    });

    it('should expose updateProduct mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('updateProduct');
    });

    it('should expose deleteProduct mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('deleteProduct');
    });

    it('should expose createImage mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('createImage');
    });

    it('should expose updateImage mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('updateImage');
    });

    it('should expose deleteImage mutation', () => {
      const fieldNames = mutationType.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('deleteImage');
    });
  });

  describe('Input types contract', () => {
    it('should have CreateProductInput with name, price, status fields', () => {
      const inputType = schema.types.find((t: any) => t.name === 'CreateProductInput');
      expect(inputType).toBeDefined();
      const fieldNames = inputType.inputFields.map((f: any) => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('price');
      expect(fieldNames).toContain('status');
    });

    it('should have CreateImageInput with url, priority, productId fields', () => {
      const inputType = schema.types.find((t: any) => t.name === 'CreateImageInput');
      expect(inputType).toBeDefined();
      const fieldNames = inputType.inputFields.map((f: any) => f.name);
      expect(fieldNames).toContain('url');
      expect(fieldNames).toContain('priority');
      expect(fieldNames).toContain('productId');
    });

    it('should have ProductFilterInput with name, status, minPrice, maxPrice fields', () => {
      const inputType = schema.types.find((t: any) => t.name === 'ProductFilterInput');
      expect(inputType).toBeDefined();
      const fieldNames = inputType.inputFields.map((f: any) => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('status');
      expect(fieldNames).toContain('minPrice');
      expect(fieldNames).toContain('maxPrice');
    });
  });
});