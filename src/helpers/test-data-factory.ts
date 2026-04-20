import { gql } from './graphql-client';

/**
 * Builder pattern for creating test products with fluent API.
 * Enables readable, self-documenting test setup.
 */
export class ProductBuilder {
  private input: Record<string, unknown> = {
    name: `Product ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    price: 50,
    status: 'ACTIVE',
  };
  private tenant = 'tenant-a';

  withName(name: string): this {
    this.input.name = name;
    return this;
  }

  withPrice(price: number): this {
    this.input.price = price;
    return this;
  }

  withStatus(status: 'ACTIVE' | 'INACTIVE'): this {
    this.input.status = status;
    return this;
  }

  forTenant(tenantId: string): this {
    this.tenant = tenantId;
    return this;
  }

  async create(): Promise<{ id: number; name: string; price: number; status: string; tenantId: string }> {
    const { data, errors } = await gql<{ createProduct: any }>(
      `mutation($input: CreateProductInput!) {
        createProduct(input: $input) { id name price status tenantId }
      }`,
      { input: this.input },
      this.tenant,
    );

    if (errors) {
      throw new Error(`ProductBuilder.create() failed: ${errors[0].message}`);
    }

    return { ...data!.createProduct, id: Number(data!.createProduct.id) };
  }
}

/**
 * Builder pattern for creating test images with fluent API.
 */
export class ImageBuilder {
  private input: Record<string, unknown> = {
    url: `https://cdn.example.com/img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`,
    priority: 50,
  };
  private tenant = 'tenant-a';

  withUrl(url: string): this {
    this.input.url = url;
    return this;
  }

  withPriority(priority: number): this {
    this.input.priority = priority;
    return this;
  }

  forProduct(productId: number): this {
    this.input.productId = productId;
    return this;
  }

  forTenant(tenantId: string): this {
    this.tenant = tenantId;
    return this;
  }

  async create(): Promise<{ id: number; url: string; priority: number; tenantId: string; productId: number | null }> {
    const { data, errors } = await gql<{ createImage: any }>(
      `mutation($input: CreateImageInput!) {
        createImage(input: $input) { id url priority tenantId productId }
      }`,
      { input: this.input },
      this.tenant,
    );

    if (errors) {
      throw new Error(`ImageBuilder.create() failed: ${errors[0].message}`);
    }

    return { ...data!.createImage, id: Number(data!.createImage.id) };
  }
}

/** Convenience factory functions */
export const buildProduct = () => new ProductBuilder();
export const buildImage = () => new ImageBuilder();
