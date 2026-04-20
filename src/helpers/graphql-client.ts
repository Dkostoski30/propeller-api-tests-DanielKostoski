const API_URL = process.env.API_URL || 'http://localhost:3000/graphql';

export interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * Sends a GraphQL request to the API.
 *
 * @param query   - GraphQL query or mutation string
 * @param variables - Optional variables object
 * @param tenantId  - Tenant ID header value (defaults to 'tenant-a')
 */
export async function gql<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
  tenantId: string = 'tenant-a',
): Promise<GraphQLResponse<T>> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ query, variables }),
  });

  return res.json() as Promise<GraphQLResponse<T>>;
}

/** Helper to create a product and return its ID for test setup. */
export async function createTestProduct(
  tenantId: string = 'tenant-a',
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; name: string; price: number; status: string }> {
  const input = {
    name: `Test Product ${Date.now()}`,
    price: 99.99,
    status: 'ACTIVE',
    ...overrides,
  };

  const { data } = await gql<{ createProduct: any }>(
    `mutation($input: CreateProductInput!) {
      createProduct(input: $input) { id name price status tenantId }
    }`,
    { input },
    tenantId,
  );

  return { ...data!.createProduct, id: Number(data!.createProduct.id) };
}

/** Helper to create an image and return its ID for test setup. */
export async function createTestImage(
  tenantId: string = 'tenant-a',
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; url: string; priority: number }> {
  const input = {
    url: `https://cdn.example.com/test-${Date.now()}.jpg`,
    priority: 100,
    ...overrides,
  };

  const { data } = await gql<{ createImage: any }>(
    `mutation($input: CreateImageInput!) {
      createImage(input: $input) { id url priority tenantId productId }
    }`,
    { input },
    tenantId,
  );

  return { ...data!.createImage, id: Number(data!.createImage.id) };
}

/** Helper to delete a product (cleanup). Ignores errors. */
export async function deleteTestProduct(id: number, tenantId: string = 'tenant-a'): Promise<void> {
  await gql(`mutation { deleteProduct(id: ${id}) }`, undefined, tenantId);
}

/** Helper to delete an image (cleanup). Ignores errors. */
export async function deleteTestImage(id: number, tenantId: string = 'tenant-a'): Promise<void> {
  await gql(`mutation { deleteImage(id: ${id}) }`, undefined, tenantId);
}