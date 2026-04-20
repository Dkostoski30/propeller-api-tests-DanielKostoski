import {
  gql,
  createTestProduct,
  createTestImage,
  deleteTestProduct,
  deleteTestImage,
} from './helpers/graphql-client';

describe('Product-Image Relationships', () => {
  let productId: number;
  const imageIds: number[] = [];

  beforeAll(async () => {
    // Create a product with multiple images
    const product = await createTestProduct('tenant-a', {
      name: 'Relationship Test Product',
      price: 75.0,
    });
    productId = product.id;

    // Create 3 images linked to this product
    for (let i = 1; i <= 3; i++) {
      const image = await createTestImage('tenant-a', {
        url: `https://cdn.example.com/rel-test-${i}.jpg`,
        priority: i * 100,
        productId: productId,
      });
      imageIds.push(image.id);
    }
  });

  afterAll(async () => {
    for (const id of imageIds) {
      await deleteTestImage(id);
    }
    await deleteTestProduct(productId);
  });

  describe('Product → Images (one-to-many)', () => {
    it('should return all linked images when querying a product', async () => {
      const { data } = await gql<{ product: any }>(
        `query($id: Int!) {
          product(id: $id) {
            id name
            images { id url priority }
          }
        }`,
        { id: productId },
      );

      expect(data!.product.images).toBeDefined();
      expect(data!.product.images.length).toBe(3);
    });

    it('should return images with correct fields', async () => {
      const { data } = await gql<{ product: any }>(
        `query($id: Int!) {
          product(id: $id) {
            images { id url priority }
          }
        }`,
        { id: productId },
      );

      for (const image of data!.product.images) {
        expect(image.id).toBeDefined();
        expect(image.url).toContain('https://cdn.example.com/rel-test-');
        expect(typeof image.priority).toBe('number');
      }
    });

    it('should return empty images array for a product with no images', async () => {
      const lonelyProduct = await createTestProduct('tenant-a', {
        name: 'No Images Product',
      });

      try {
        const { data } = await gql<{ product: any }>(
          `query($id: Int!) {
            product(id: $id) { id images { id } }
          }`,
          { id: lonelyProduct.id },
        );

        expect(data!.product.images).toEqual([]);
      } finally {
        await deleteTestProduct(lonelyProduct.id);
      }
    });
  });

  describe('Image → Product (many-to-one)', () => {
    it('should return the parent product when querying an image', async () => {
      const { data } = await gql<{ image: any }>(
        `query($id: Int!) {
          image(id: $id) {
            id url
            product { id name price }
          }
        }`,
        { id: imageIds[0] },
      );

      expect(data!.image.product).toBeDefined();
      expect(Number(data!.image.product.id)).toBe(productId);
      expect(data!.image.product.name).toBe('Relationship Test Product');
    });

    it('should return null product for an orphan image', async () => {
      const orphanImage = await createTestImage('tenant-a', {
        url: 'https://cdn.example.com/orphan-rel-test.jpg',
      });

      try {
        const { data } = await gql<{ image: any }>(
          `query($id: Int!) {
            image(id: $id) { id product { id name } }
          }`,
          { id: orphanImage.id },
        );

        expect(data!.image.product).toBeNull();
      } finally {
        await deleteTestImage(orphanImage.id);
      }
    });
  });

  describe('Linking and unlinking', () => {
    it('should link an orphan image to a product via update', async () => {
      const orphanImage = await createTestImage('tenant-a', {
        url: 'https://cdn.example.com/link-test.jpg',
      });

      try {
        // Link it to the product
        const { data } = await gql<{ updateImage: any }>(
          `mutation($id: Int!, $input: UpdateImageInput!) {
            updateImage(id: $id, input: $input) { id productId product { id name } }
          }`,
          { id: orphanImage.id, input: { productId: productId } },
        );

        expect(Number(data!.updateImage.productId)).toBe(productId);
        expect(data!.updateImage.product).toBeDefined();
      } finally {
        await deleteTestImage(orphanImage.id);
      }
    });

    it('should include newly linked image in product images list', async () => {
      const newImage = await createTestImage('tenant-a', {
        url: 'https://cdn.example.com/new-link.jpg',
        productId: productId,
      });

      try {
        const { data } = await gql<{ product: any }>(
          `query($id: Int!) {
            product(id: $id) { images { id } }
          }`,
          { id: productId },
        );

        const imageIdStrings = data!.product.images.map((i: any) => Number(i.id));
        expect(imageIdStrings).toContain(newImage.id);
      } finally {
        await deleteTestImage(newImage.id);
      }
    });
  });

  describe('Filtering images by product', () => {
    it('should return only images for a specific product when using productId filter', async () => {
      const { data } = await gql<{ images: any[] }>(
        `query($productId: Int) {
          images(productId: $productId) { id productId }
        }`,
        { productId: productId },
      );

      expect(data!.images.length).toBeGreaterThanOrEqual(3);
      for (const image of data!.images) {
        expect(Number(image.productId)).toBe(productId);
      }
    });
  });
});