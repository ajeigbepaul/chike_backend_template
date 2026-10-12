import crypto from "crypto";

// Columns the importer understands. Export emits the same set, so an
// export -> edit -> re-import round trip keeps everything.
export const IMPORT_COLUMNS = [
  "name",
  "description",
  "summary",
  "price",
  "priceUnit",
  "quantity",
  "moq",
  "category",
  "brand",
  "imageCover",
  "tags",
  "colors",
  "sizes",
  "features",
  "specifications",
  "weightValue",
  "weightUnit",
  "length",
  "width",
  "height",
  "dimensionUnit",
  "isBulk",
  "minBulkQuantity",
  "bulkDiscountPercentage",
];

export const TEMPLATE_EXAMPLE_ROW = {
  name: "Galvanised Steel Pipe 2 inch",
  description: "Heavy duty galvanised steel pipe suitable for plumbing.",
  summary: "Heavy duty galvanised steel pipe",
  price: 14500,
  priceUnit: "piece",
  quantity: 120,
  moq: 1,
  category: "Plumbing",
  brand: "",
  imageCover: "https://example.com/pipe.jpg",
  tags: "steel,pipe,plumbing",
  colors: "Silver,Grey",
  sizes: "2 inch,3 inch",
  features: "Rust resistant,Threaded ends",
  specifications: "Material:Galvanised Steel|Size:2 inch,3 inch,4 inch|Weight:2.5kg",
  weightValue: 2.5,
  weightUnit: "kg",
  length: 6,
  width: 0.05,
  height: 0.05,
  dimensionUnit: "m",
  isBulk: "false",
  minBulkQuantity: "",
  bulkDiscountPercentage: "",
};

export const generateSerialNumber = () =>
  "Chi" + crypto.randomBytes(5).toString("hex").toUpperCase();

const str = (v) => (v === null || v === undefined ? "" : String(v).trim());

/** "a,b,c" -> ["a","b","c"], dropping blanks. */
export const parseList = (value) =>
  str(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** "Material:Steel|Weight:2.5kg" -> [{key,value}]. */
export const parseSpecifications = (value) =>
  str(value)
    .split("|")
    .map((pair) => {
      const idx = pair.indexOf(":");
      if (idx === -1) return null;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      return key && val ? { key, value: val } : null;
    })
    .filter(Boolean);

/** Serialise back out for export, inverse of parseSpecifications. */
export const serializeSpecifications = (specs = []) =>
  specs
    .filter((s) => s && s.key)
    .map((s) => `${s.key}:${s.value ?? ""}`)
    .join("|");

const parseNumber = (value) => {
  const s = str(value);
  if (!s) return undefined;
  // Tolerate "14,500" and "₦14500" from spreadsheets.
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const parseBoolean = (value) => {
  const s = str(value).toLowerCase();
  if (!s) return undefined;
  return ["true", "yes", "y", "1"].includes(s);
};

/**
 * Map one spreadsheet row onto a Product document.
 *
 * Returns { doc, errors } - errors are human-readable strings naming the
 * column at fault, so the admin can fix the sheet rather than guess.
 *
 * Lookup maps are name(lowercased) -> ObjectId, built once by the caller.
 */
export const rowToProduct = (row, { categoryMap, brandMap, vendorId }) => {
  const errors = [];
  const get = (col) => str(row[col]);

  const name = get("name");
  if (!name) errors.push("name is required");

  const price = parseNumber(row.price);
  if (price === undefined) errors.push("price is required and must be a number");

  const quantity = parseNumber(row.quantity);
  if (quantity === undefined)
    errors.push("quantity is required and must be a number");

  // Category may be given by name or by raw ObjectId.
  const categoryRaw = get("category");
  let category;
  if (!categoryRaw) {
    errors.push("category is required");
  } else if (/^[0-9a-fA-F]{24}$/.test(categoryRaw)) {
    category = categoryRaw;
  } else {
    category = categoryMap.get(categoryRaw.toLowerCase());
    if (!category) errors.push(`category "${categoryRaw}" not found`);
  }

  // Brand is optional; an unknown name is an error rather than silently dropped.
  const brandRaw = get("brand");
  let brand;
  if (brandRaw) {
    if (/^[0-9a-fA-F]{24}$/.test(brandRaw)) {
      brand = brandRaw;
    } else {
      brand = brandMap.get(brandRaw.toLowerCase());
      if (!brand) errors.push(`brand "${brandRaw}" not found`);
    }
  }

  const imageCover = get("imageCover");
  if (!imageCover) errors.push("imageCover is required (a public image URL)");

  const doc = {
    name,
    description: get("description"),
    summary: get("summary") || undefined,
    price,
    quantity,
    category,
    brand,
    vendor: vendorId,
    imageCover, // resolved to a Cloudinary URL by the caller
    serialNumber: generateSerialNumber(),
    moq: parseNumber(row.moq) ?? 1,
    tags: parseList(row.tags),
    colors: parseList(row.colors),
    sizes: parseList(row.sizes),
    features: parseList(row.features),
    specifications: parseSpecifications(row.specifications),
  };

  const priceUnit = get("priceUnit");
  if (priceUnit) doc.priceUnit = priceUnit;

  const weightValue = parseNumber(row.weightValue);
  if (weightValue !== undefined) {
    doc.weight = { value: weightValue };
    const unit = get("weightUnit");
    if (unit) doc.weight.unit = unit;
  }

  const length = parseNumber(row.length);
  const width = parseNumber(row.width);
  const height = parseNumber(row.height);
  if (length !== undefined || width !== undefined || height !== undefined) {
    doc.dimensions = { length, width, height };
    const unit = get("dimensionUnit");
    if (unit) doc.dimensions.unit = unit;
  }

  const isBulk = parseBoolean(row.isBulk);
  if (isBulk !== undefined) doc.isBulk = isBulk;
  const minBulkQuantity = parseNumber(row.minBulkQuantity);
  if (minBulkQuantity !== undefined) doc.minBulkQuantity = minBulkQuantity;
  const bulkDiscount = parseNumber(row.bulkDiscountPercentage);
  if (bulkDiscount !== undefined) doc.bulkDiscountPercentage = bulkDiscount;

  return { doc, errors };
};

/** Flatten a Product back into a single export row. */
export const productToRow = (product) => ({
  name: product.name ?? "",
  description: product.description ?? "",
  summary: product.summary ?? "",
  price: product.price ?? "",
  priceUnit: product.priceUnit ?? "",
  quantity: product.quantity ?? "",
  moq: product.moq ?? "",
  category: product.category?.name ?? "",
  brand: product.brand?.name ?? "",
  imageCover: product.imageCover ?? "",
  tags: (product.tags ?? []).join(","),
  colors: (product.colors ?? []).join(","),
  sizes: (product.sizes ?? []).join(","),
  features: (product.features ?? []).join(","),
  specifications: serializeSpecifications(product.specifications),
  weightValue: product.weight?.value ?? "",
  weightUnit: product.weight?.unit ?? "",
  length: product.dimensions?.length ?? "",
  width: product.dimensions?.width ?? "",
  height: product.dimensions?.height ?? "",
  dimensionUnit: product.dimensions?.unit ?? "",
  isBulk: product.isBulk ? "true" : "false",
  minBulkQuantity: product.minBulkQuantity ?? "",
  bulkDiscountPercentage: product.bulkDiscountPercentage ?? "",
});

/**
 * Run an async mapper over items with bounded concurrency, so a 200-row
 * import doesn't open 200 simultaneous Cloudinary uploads.
 */
export const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};
