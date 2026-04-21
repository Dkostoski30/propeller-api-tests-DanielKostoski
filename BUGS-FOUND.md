# Bugs Found in Propeller E-Commerce GraphQL API

## Critical Bugs

### 1. Price Data Type Mismatch
**File:** `src/product/product.entity.ts` (line 25-27)

```typescript
@Field(() => Float)
@Column({ type: 'int' })
price: number;
```

**Problem:** GraphQL declares price as `Float`, but the DB column is `int`. Decimal prices (e.g., `29.99`) are silently truncated to `29`.

**Reproduce:** Create a product with price `29.99`, query it back — you get `29`.

**Fix:** Change column type to `decimal` or `numeric`, or change GraphQL type to `Int`.

---

### 2. Seed Script Uses Non-Existent Method
**File:** `src/seed.ts` (lines 24-25)

```typescript
await imageRepo.deleteAll();
await productRepo.deleteAll();
```

**Problem:** `.deleteAll()` doesn't exist in TypeORM. Script crashes with "deleteAll is not a function".

**Fix:** Use `await imageRepo.delete({})` and `await productRepo.delete({})`.

---

## Medium Bugs

### 3. Pagination Offset Calculation
**File:** `src/product/product.service.ts` (line 41)

```typescript
qb.skip(page * pageSize).take(pageSize);
```

**Problem:** With 1-indexed pages, `page=1` skips `pageSize` records (returns page 2). If you have 12 products and pageSize=50, page 1 returns nothing.

**Fix:** `qb.skip((page - 1) * pageSize).take(pageSize);`

---

### 4. Priority Validation Inconsistency (Create vs Update)
**File:** `src/image/image.service.ts` (line 47 vs line 72)

```typescript
// CREATE: rejects 0
if (input.priority !== undefined && (input.priority <= 0 || input.priority > 1000))

// UPDATE: allows 0
if (input.priority !== undefined && (input.priority < 0 || input.priority > 1000))
```

**Problem:** You can't create an image with priority 0, but you can update one to priority 0. Inconsistent behavior.

**Reproduce:** Create image with priority 0 → fails. Create with priority 50, then update to 0 → succeeds.

---

### 5. Priority Error Message is Misleading
**File:** `src/image/image.service.ts` (line 48)

```typescript
throw new BadRequestException('Priority must be between 0 and 1000');
```

**Problem:** Message says "between 0 and 1000" but the code rejects 0 (`<= 0`). Valid range is actually 1–1000.

**Fix:** Change message to "Priority must be between 1 and 1000".

---

### 6. Image Create/Update Doesn't Validate ProductId
**File:** `src/image/image.service.ts` (lines 40-56, 58-80)

**Problem:** When creating or updating an image with a `productId`, the service doesn't verify:
- That the product exists
- That the product belongs to the same tenant

**Reproduce:**
1. Create image with `productId: 9999` (non-existent) → succeeds with broken reference
2. Create image for tenant-a with a tenant-b productId → cross-tenant relationship created

---

### 7. Page/PageSize Parameters Not Validated
**File:** `src/product/product.service.ts` (line 41)

**Problem:** No validation on `page` or `pageSize`. Passing `page: 0` or `page: -5` produces negative skip values. Passing `pageSize: 1000000` could cause performance issues.

**Reproduce:** Query with `page: 0` → `skip((0-1) * 10) = skip(-10)` → undefined behavior.

---

### 8. MinPrice/MaxPrice Filters Silently Ignored When Negative
**File:** `src/product/product.service.ts` (lines 33-39)

```typescript
if (filter?.minPrice !== undefined && filter?.minPrice >= 0) {
  qb.andWhere('product.price >= :minPrice', { minPrice: filter.minPrice });
}
```

**Problem:** If `minPrice: -100` is passed, the condition `>= 0` fails, so the filter is silently ignored. No error, no indication it didn't work.

---

## Low Bugs

### 9. Redundant Tenant Check + Wrong Error Message in Image findOne
**File:** `src/image/image.service.ts` (lines 22-34)

```typescript
const image = await this.imageRepository.findOne({
  where: { id, tenantId },  // Already filters by tenant
});
// ...
if (image.tenantId !== tenantId) {  // Unreachable — already filtered above
  throw new NotFoundException(`Image with ID ${image.tenantId} not found`);
  //                                         ^^^^^^^^^^^^^^^^ Wrong! Shows tenantId, not image ID
}
```

**Problem:** Second check is unreachable (WHERE already filters). Error message template is also wrong — shows `tenantId` instead of `id`.

---

### 10. Product Name Regex Rejects Valid Characters
**File:** `src/product/product.service.ts` (line 68)

```typescript
if (!/^[a-zA-Z0-9\s\-_.,&'()]+$/.test(input.name.trim())) {
  throw new BadRequestException('Product name contains invalid characters');
}
```

**Problem:** Rejects unicode characters, accented letters (é, ü), currency symbols (€, £), trademark (™), and other legitimate product name characters.

**Reproduce:** Create product named `"Café Blend™"` or `"日本語テスト"` → rejected.

---

## Summary

| # | Bug | Severity | Already Tested? |
|---|-----|----------|-----------------|
| 1 | Price Float vs Int mismatch | CRITICAL | Partially (validation tests) |
| 2 | Seed deleteAll() | CRITICAL | Not directly testable via API |
| 3 | Pagination offset | MEDIUM | Yes (bug-verification.spec.ts) |
| 4 | Priority create vs update inconsistency | MEDIUM | No |
| 5 | Priority error message misleading | MEDIUM | No |
| 6 | Image productId not validated | MEDIUM | No |
| 7 | Page/pageSize not validated | MEDIUM | No |
| 8 | Negative filter silently ignored | LOW | No |
| 9 | Redundant tenant check + wrong message | LOW | No |
| 10 | Name regex too restrictive | LOW | Partially (unicode test) |

## Tests Still Needed

- Priority validation inconsistency (create with 0 fails, update to 0 succeeds)
- Image created with non-existent productId
- Image created with cross-tenant productId
- Page=0 or negative page values
- pageSize=0 or very large pageSize
- Negative minPrice/maxPrice filter behavior