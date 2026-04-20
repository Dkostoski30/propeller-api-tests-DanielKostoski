import { gql, createTestImage, createTestProduct, deleteTestImage, deleteTestProduct } from '../helpers/graphql-client';

describe('Image Queries', () => {
  describe('images (list)', () => {
    it('should return a list of images for the requesting tenant', async () => {
      const { data, errors } = await gql<{ images: any[] }>(
        `query { images { id url priority tenantId } }`,
      );

      expect(errors).toBeUndefined();
      expect(data!.images).toBeDefined();
      expect(Array.isArray(data!.images)).toBe(true);
      expect(data!.images.length).toBeGreaterThan(0);
    });

    it('should only return images belonging to the requesting tenant', async () => {
      const { data } = await gql<{ images: any[] }>(
        `query { images { id tenantId } }`,
        undefined,
        'tenant-a',
      );

      for (const image of data!.images) {
        expect(image.tenantId).toBe('tenant-a');
      }
    });

    it('should filter images by productId', async () => {
      // First create a product and an image linked to it
      const product = await createTestProduct('tenant-a', { name: 'Image Filter Product' });
      const image = await createTestImage('tenant-a', {
        url: 'https://cdn.example.com/filter-test.jpg',
        productId: product.id,
      });

      try {
        const { data } = await gql<{ images: any[] }>(
          `query($productId: Int) { images(productId: $productId) { id productId } }`,
          { productId: product.id },
        );

        expect(data!.images.length).toBeGreaterThan(0);
        for (const img of data!.images) {
          expect(Number(img.productId)).toBe(product.id);
        }
      } finally {
        await deleteTestImage(image.id);
        await deleteTestProduct(product.id);
      }
    });

    it('should include product relation in image results', async () => {
      const { data } = await gql<{ images: any[] }>(
        `query { images { id url product { id name } } }`,
      );

      expect(data!.images).toBeDefined();
      // At least one image should have a product (from seed data)
      const imageWithProduct = data!.images.find((i: any) => i.product !== null);
      expect(imageWithProduct).toBeDefined();
      expect(imageWithProduct.product.id).toBeDefined();
      expect(imageWithProduct.product.name).toBeDefined();
    });
  });

  describe('image (single by ID)', () => {
    let testImageId: number;

    beforeAll(async () => {
      const image = await createTestImage('tenant-a', {
        url: 'https://cdn.example.com/single-query-test.jpg',
      });
      testImageId = image.id;
    });

    afterAll(async () => {
      await deleteTestImage(testImageId);
    });

    it('should return a single image by ID', async () => {
      const { data, errors } = await gql<{ image: any }>(
        `query($id: Int!) {
          image(id: $id) { id url priority tenantId }
        }`,
        { id: testImageId },
      );

      expect(errors).toBeUndefined();
      expect(data!.image).toBeDefined();
      expect(Number(data!.image.id)).toBe(testImageId);
    });

    it('should return error for non-existent image ID', async () => {
      const { errors } = await gql(
        `query { image(id: 999999) { id } }`,
      );

      expect(errors).toBeDefined();
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors![0].message).toContain('not found');
    });
  });
});