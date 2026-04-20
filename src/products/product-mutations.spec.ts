import { gql, deleteTestProduct } from '../helpers/graphql-client';

describe('Product Mutations', () => {
  const createdProductIds: number[] = [];

  afterAll(async () => {
    for (const id of createdProductIds) {
      await deleteTestProduct(id);
    }
  });

  describe('createProduct', () => {
    it('should create a product with required fields', async () => {
      const { data, errors } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name price status tenantId }
        }`,
        { input: { name: 'New Test Product', price: 49.99 } },
      );

      expect(errors).toBeUndefined();
      expect(data!.createProduct).toBeDefined();
      expect(data!.createProduct.name).toBe('New Test Product');
      expect(data!.createProduct.price).toBe(49.99);
      expect(data!.createProduct.tenantId).toBe('tenant-a');
      createdProductIds.push(Number(data!.createProduct.id));
    });

    it('should create a product with explicit ACTIVE status', async () => {
      const { data } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name price status }
        }`,
        { input: { name: 'Active Product', price: 10.0, status: 'ACTIVE' } },
      );

      expect(data!.createProduct.status).toBe('ACTIVE');
      createdProductIds.push(Number(data!.createProduct.id));
    });

    it('should create a product with INACTIVE status', async () => {
      const { data } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name status }
        }`,
        { input: { name: 'Inactive Product', price: 5.0, status: 'INACTIVE' } },
      );

      expect(data!.createProduct.status).toBe('INACTIVE');
      createdProductIds.push(Number(data!.createProduct.id));
    });

    it('should assign the product to the requesting tenant', async () => {
      const { data } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id tenantId }
        }`,
        { input: { name: 'Tenant B Product', price: 20.0 } },
        'tenant-b',
      );

      expect(data!.createProduct.tenantId).toBe('tenant-b');
      createdProductIds.push(Number(data!.createProduct.id));
    });

    it('should reject creation without a name', async () => {
      const { errors } = await gql(
        `mutation {
          createProduct(input: { price: 10.0 }) { id }
        }`,
      );

      expect(errors).toBeDefined();
    });

    it('should reject creation without a price', async () => {
      const { errors } = await gql(
        `mutation {
          createProduct(input: { name: "No Price" }) { id }
        }`,
      );

      expect(errors).toBeDefined();
    });
  });

  describe('updateProduct', () => {
    let productId: number;

    beforeAll(async () => {
      const { data } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Update Me', price: 30.0, status: 'ACTIVE' } },
      );
      productId = Number(data!.createProduct.id);
      createdProductIds.push(productId);
    });

    it('should update the product name', async () => {
      const { data, errors } = await gql<{ updateProduct: any }>(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id name }
        }`,
        { id: productId, input: { name: 'Updated Name' } },
      );

      expect(errors).toBeUndefined();
      expect(data!.updateProduct.name).toBe('Updated Name');
    });

    it('should update the product price', async () => {
      const { data } = await gql<{ updateProduct: any }>(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id price }
        }`,
        { id: productId, input: { price: 55.55 } },
      );

      expect(data!.updateProduct.price).toBe(55.55);
    });

    it('should update the product status', async () => {
      const { data } = await gql<{ updateProduct: any }>(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id status }
        }`,
        { id: productId, input: { status: 'INACTIVE' } },
      );

      expect(data!.updateProduct.status).toBe('INACTIVE');
    });

    it('should return error when updating a non-existent product', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id }
        }`,
        { id: 999999, input: { name: 'Ghost' } },
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });
  });

  describe('deleteProduct', () => {
    it('should delete an existing product', async () => {
      const { data: created } = await gql<{ createProduct: any }>(
        `mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name: 'Delete Me', price: 1.0 } },
      );
      const id = Number(created!.createProduct.id);

      const { data, errors } = await gql<{ deleteProduct: boolean }>(
        `mutation($id: Int!) { deleteProduct(id: $id) }`,
        { id },
      );

      expect(errors).toBeUndefined();
      expect(data!.deleteProduct).toBe(true);

      // Verify it's actually gone
      const { errors: getErrors } = await gql(
        `query($id: Int!) { product(id: $id) { id } }`,
        { id },
      );
      expect(getErrors).toBeDefined();
    });

    it('should return error when deleting a non-existent product', async () => {
      const { errors } = await gql(
        `mutation { deleteProduct(id: 999999) }`,
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });
  });
});