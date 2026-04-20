import { gql, createTestProduct, deleteTestProduct, deleteTestImage } from '../helpers/graphql-client';

describe('Image Mutations', () => {
  const createdImageIds: number[] = [];
  const createdProductIds: number[] = [];

  afterAll(async () => {
    for (const id of createdImageIds) {
      await deleteTestImage(id);
    }
    for (const id of createdProductIds) {
      await deleteTestProduct(id);
    }
  });

  describe('createImage', () => {
    it('should create an image with a valid URL', async () => {
      const { data, errors } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id url priority tenantId }
        }`,
        { input: { url: 'https://cdn.example.com/new-image.jpg' } },
      );

      expect(errors).toBeUndefined();
      expect(data!.createImage).toBeDefined();
      expect(data!.createImage.url).toBe('https://cdn.example.com/new-image.jpg');
      expect(data!.createImage.tenantId).toBe('tenant-a');
      createdImageIds.push(Number(data!.createImage.id));
    });

    it('should create an image with a custom priority', async () => {
      const { data } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id url priority }
        }`,
        { input: { url: 'https://cdn.example.com/priority-test.jpg', priority: 500 } },
      );

      expect(data!.createImage.priority).toBe(500);
      createdImageIds.push(Number(data!.createImage.id));
    });

    it('should create an image linked to a product', async () => {
      const product = await createTestProduct('tenant-a', { name: 'Image Parent Product' });
      createdProductIds.push(product.id);

      const { data } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id url productId }
        }`,
        { input: { url: 'https://cdn.example.com/linked.jpg', productId: product.id } },
      );

      expect(Number(data!.createImage.productId)).toBe(product.id);
      createdImageIds.push(Number(data!.createImage.id));
    });

    it('should create an orphan image (no productId)', async () => {
      const { data } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id url productId }
        }`,
        { input: { url: 'https://cdn.example.com/orphan.jpg' } },
      );

      expect(data!.createImage.productId).toBeNull();
      createdImageIds.push(Number(data!.createImage.id));
    });

    it('should assign the image to the requesting tenant', async () => {
      const { data } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id tenantId }
        }`,
        { input: { url: 'https://cdn.example.com/tenant-b-img.jpg' } },
        'tenant-b',
      );

      expect(data!.createImage.tenantId).toBe('tenant-b');
      createdImageIds.push(Number(data!.createImage.id));
    });

    it('should reject creation with an invalid URL', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'not-a-valid-url' } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject creation without a URL', async () => {
      const { errors } = await gql(
        `mutation {
          createImage(input: {}) { id }
        }`,
      );

      expect(errors).toBeDefined();
    });

    it('should reject priority below minimum (1)', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/low-prio.jpg', priority: 0 } },
      );

      expect(errors).toBeDefined();
    });

    it('should reject priority above maximum (1000)', async () => {
      const { errors } = await gql(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/high-prio.jpg', priority: 1001 } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('updateImage', () => {
    let imageId: number;

    beforeAll(async () => {
      const { data } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/update-me.jpg', priority: 100 } },
      );
      imageId = Number(data!.createImage.id);
      createdImageIds.push(imageId);
    });

    it('should update the image URL', async () => {
      const { data, errors } = await gql<{ updateImage: any }>(
        `mutation($id: Int!, $input: UpdateImageInput!) {
          updateImage(id: $id, input: $input) { id url }
        }`,
        { id: imageId, input: { url: 'https://cdn.example.com/updated.jpg' } },
      );

      expect(errors).toBeUndefined();
      expect(data!.updateImage.url).toBe('https://cdn.example.com/updated.jpg');
    });

    it('should update the image priority', async () => {
      const { data } = await gql<{ updateImage: any }>(
        `mutation($id: Int!, $input: UpdateImageInput!) {
          updateImage(id: $id, input: $input) { id priority }
        }`,
        { id: imageId, input: { priority: 750 } },
      );

      expect(data!.updateImage.priority).toBe(750);
    });

    it('should return error when updating a non-existent image', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateImageInput!) {
          updateImage(id: $id, input: $input) { id }
        }`,
        { id: 999999, input: { url: 'https://cdn.example.com/ghost.jpg' } },
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });

    it('should reject update with an invalid URL', async () => {
      const { errors } = await gql(
        `mutation($id: Int!, $input: UpdateImageInput!) {
          updateImage(id: $id, input: $input) { id }
        }`,
        { id: imageId, input: { url: 'not-valid' } },
      );

      expect(errors).toBeDefined();
    });
  });

  describe('deleteImage', () => {
    it('should delete an existing image', async () => {
      const { data: created } = await gql<{ createImage: any }>(
        `mutation($input: CreateImageInput!) {
          createImage(input: $input) { id }
        }`,
        { input: { url: 'https://cdn.example.com/delete-me.jpg' } },
      );
      const id = Number(created!.createImage.id);

      const { data, errors } = await gql<{ deleteImage: boolean }>(
        `mutation($id: Int!) { deleteImage(id: $id) }`,
        { id },
      );

      expect(errors).toBeUndefined();
      expect(data!.deleteImage).toBe(true);

      // Verify it's gone
      const { errors: getErrors } = await gql(
        `query($id: Int!) { image(id: $id) { id } }`,
        { id },
      );
      expect(getErrors).toBeDefined();
    });

    it('should return error when deleting a non-existent image', async () => {
      const { errors } = await gql(
        `mutation { deleteImage(id: 999999) }`,
      );

      expect(errors).toBeDefined();
      expect(errors![0].message).toContain('not found');
    });
  });
});