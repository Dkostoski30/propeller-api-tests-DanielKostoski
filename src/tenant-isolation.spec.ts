import {
  gql,
  createTestProduct,
  createTestImage,
  deleteTestProduct,
  deleteTestImage,
} from './helpers/graphql-client';

describe('Multi-Tenant Data Isolation', () => {
  /**
   * These tests verify that tenants are fully isolated:
   * - A tenant should only see their own products and images
   * - A tenant should NOT be able to read, update, or delete another tenant's data
   */

  let tenantAProductId: number;
  let tenantBProductId: number;
  let tenantAImageId: number;
  let tenantBImageId: number;

  beforeAll(async () => {
    // Create products in each tenant
    const productA = await createTestProduct('tenant-a', {
      name: 'Tenant A Isolation Test Product',
      price: 10.0,
    });
    tenantAProductId = productA.id;

    const productB = await createTestProduct('tenant-b', {
      name: 'Tenant B Isolation Test Product',
      price: 20.0,
    });
    tenantBProductId = productB.id;

    // Create images in each tenant
    const imageA = await createTestImage('tenant-a', {
      url: 'https://cdn.example.com/tenant-a-isolation.jpg',
      productId: tenantAProductId,
    });
    tenantAImageId = imageA.id;

    const imageB = await createTestImage('tenant-b', {
      url: 'https://cdn.example.com/tenant-b-isolation.jpg',
      productId: tenantBProductId,
    });
    tenantBImageId = imageB.id;
  });

  afterAll(async () => {
    await deleteTestImage(tenantAImageId, 'tenant-a');
    await deleteTestImage(tenantBImageId, 'tenant-b');
    await deleteTestProduct(tenantAProductId, 'tenant-a');
    await deleteTestProduct(tenantBProductId, 'tenant-b');
  });

  describe('Product Isolation', () => {
    it('tenant-a product list should not contain tenant-b products', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id tenantId } }`,
        undefined,
        'tenant-a',
      );

      const tenantBProducts = data!.products.filter((p: any) => p.tenantId === 'tenant-b');
      expect(tenantBProducts).toHaveLength(0);
    });

    it('tenant-b product list should not contain tenant-a products', async () => {
      const { data } = await gql<{ products: any[] }>(
        `query { products(pageSize: 100) { id tenantId } }`,
        undefined,
        'tenant-b',
      );

      const tenantAProducts = data!.products.filter((p: any) => p.tenantId === 'tenant-a');
      expect(tenantAProducts).toHaveLength(0);
    });

    it('tenant-a should NOT be able to fetch tenant-b product by ID', async () => {
      const { data, errors } = await gql<{ product: any }>(
        `query($id: Int!) { product(id: $id) { id tenantId } }`,
        { id: tenantBProductId },
        'tenant-a',
      );

      // Should either return an error or not return the product
      if (errors) {
        expect(errors[0].message).toContain('not found');
      } else {
        // If it returns data, the tenantId should NOT be tenant-b (it should be filtered)
        expect(data!.product).toBeNull();
      }
    });

    it('tenant-b should NOT be able to fetch tenant-a product by ID', async () => {
      const { data, errors } = await gql<{ product: any }>(
        `query($id: Int!) { product(id: $id) { id tenantId } }`,
        { id: tenantAProductId },
        'tenant-b',
      );

      if (errors) {
        expect(errors[0].message).toContain('not found');
      } else {
        expect(data!.product).toBeNull();
      }
    });

    it('tenant-a should NOT be able to update tenant-b product', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateProductInput!) {
          updateProduct(id: $id, input: $input) { id name }
        }`,
        { id: tenantBProductId, input: { name: 'Hijacked by tenant-a', price: 1.0 } },
        'tenant-a',
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });

    it('tenant-a should NOT be able to delete tenant-b product', async () => {
      const { errors } = await gql(
        `mutation($id: Int!) { deleteProduct(id: $id) }`,
        { id: tenantBProductId },
        'tenant-a',
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');

      // Verify tenant-b product still exists
      const { data } = await gql<{ product: any }>(
        `query($id: Int!) { product(id: $id) { id } }`,
        { id: tenantBProductId },
        'tenant-b',
      );
      expect(data!.product).toBeDefined();
    });
  });

  describe('Image Isolation', () => {
    it('tenant-a image list should not contain tenant-b images', async () => {
      const { data } = await gql<{ images: any[] }>(
        `query { images { id tenantId } }`,
        undefined,
        'tenant-a',
      );

      const tenantBImages = data!.images.filter((i: any) => i.tenantId === 'tenant-b');
      expect(tenantBImages).toHaveLength(0);
    });

    it('tenant-b image list should not contain tenant-a images', async () => {
      const { data } = await gql<{ images: any[] }>(
        `query { images { id tenantId } }`,
        undefined,
        'tenant-b',
      );

      const tenantAImages = data!.images.filter((i: any) => i.tenantId === 'tenant-a');
      expect(tenantAImages).toHaveLength(0);
    });

    it('tenant-a should NOT be able to fetch tenant-b image by ID', async () => {
      const { data, errors } = await gql<{ image: any }>(
        `query($id: Int!) { image(id: $id) { id tenantId } }`,
        { id: tenantBImageId },
        'tenant-a',
      );

      if (errors) {
        expect(errors[0].message).toContain('not found');
      } else {
        expect(data!.image).toBeNull();
      }
    });

    it('tenant-a should NOT be able to update tenant-b image', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateImageInput!) {
          updateImage(id: $id, input: $input) { id }
        }`,
        { id: tenantBImageId, input: { url: 'https://cdn.example.com/hijacked.jpg' } },
        'tenant-a',
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });

    it('tenant-a should NOT be able to delete tenant-b image', async () => {
      const { errors } = await gql(
        `mutation($id: Int!) { deleteImage(id: $id) }`,
        { id: tenantBImageId },
        'tenant-a',
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');

      // Verify tenant-b image still exists
      const { data } = await gql<{ image: any }>(
        `query($id: Int!) { image(id: $id) { id } }`,
        { id: tenantBImageId },
        'tenant-b',
      );
      expect(data!.image).toBeDefined();
    });
  });
});