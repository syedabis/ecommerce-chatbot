import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface SheetProduct {
  id: string;
  title: string;
  category: string;
  section: string;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  rating: number;
  availableSizes: string;
  availableColors: string;
  materialComposition: string;
  fitType: string;
  careInstructions: string;
  description: string;
  productUrl: string;
}

let cachedProducts: SheetProduct[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

let cachedToken: string | null = null;
let tokenExpiryTime = 0;

function getServiceAccountCredentials() {
  // 1. Check if raw JSON or base64 JSON string is in environment variable (for Vercel / serverless)
  const envKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_CREDENTIALS;

  if (envKey) {
    try {
      const trimmed = envKey.trim();
      if (trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
      }
      // Try decoding base64 if user encoded it
      const decoded = Buffer.from(trimmed, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (e: any) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY from env:", e.message);
    }
  }

  // 2. Check local file path if present (for local development)
  const customPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "proposal-493608-3d667e3fd17d.json";
  const resolvedPath = path.isAbsolute(customPath)
    ? customPath
    : path.join(process.cwd(), customPath);

  if (fs.existsSync(resolvedPath)) {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    return JSON.parse(raw);
  }

  throw new Error(
    `Google service account credentials not found. Please set GOOGLE_SERVICE_ACCOUNT_KEY in Vercel environment variables or provide file at ${resolvedPath}`
  );
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiryTime - 60) {
    return cachedToken;
  }

  const creds = getServiceAccountCredentials();
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: creds.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const signatureInput = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();

  const signature = signer
    .sign(creds.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${signature}`;

  const res = await fetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to obtain Google OAuth access token: ${errorText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiryTime = now + (data.expires_in || 3600);
  return cachedToken!;
}

export const DEFAULT_CATALOG_PRODUCTS: SheetProduct[] = [
  {
    id: "1",
    title: "T-shirt with Tape Details",
    category: "T-shirts",
    section: "New Arrivals",
    originalPrice: 120,
    discount: 0,
    finalPrice: 120,
    rating: 4.5,
    availableSizes: "Small, Medium, Large, X-Large",
    availableColors: "Black, White, Olive",
    materialComposition: "100% Cotton",
    fitType: "Regular Fit",
    careInstructions: "Machine wash cold",
    description: "Classic crewneck t-shirt featuring tape details along sleeves.",
    productUrl: "/shop/product/1/t-shirt-with-tape-details",
  },
  {
    id: "2",
    title: "Skinny Fit Jeans",
    category: "Jeans",
    section: "New Arrivals",
    originalPrice: 260,
    discount: 20,
    finalPrice: 208,
    rating: 3.5,
    availableSizes: "28, 30, 32, 34, 36",
    availableColors: "Dark Blue, Black",
    materialComposition: "98% Cotton, 2% Elastane",
    fitType: "Skinny Fit",
    careInstructions: "Machine wash cold, inside out",
    description: "Comfortable stretch denim with modern skinny tapered cut. Currently on 20% sale!",
    productUrl: "/shop/product/2/skinny-fit-jeans",
  },
  {
    id: "3",
    title: "Chechered Shirt",
    category: "Shirts",
    section: "New Arrivals",
    originalPrice: 180,
    discount: 0,
    finalPrice: 180,
    rating: 4.5,
    availableSizes: "Small, Medium, Large",
    availableColors: "Red/Black, Blue/White",
    materialComposition: "100% Cotton Flannel",
    fitType: "Regular Fit",
    careInstructions: "Machine wash warm",
    description: "Timeless checkered long sleeve button-up shirt.",
    productUrl: "/shop/product/3/chechered-shirt",
  },
  {
    id: "4",
    title: "Sleeve Striped T-shirt",
    category: "T-shirts",
    section: "New Arrivals",
    originalPrice: 160,
    discount: 30,
    finalPrice: 112,
    rating: 4.5,
    availableSizes: "Medium, Large, X-Large",
    availableColors: "Orange/White, Navy/White",
    materialComposition: "100% Organic Cotton",
    fitType: "Relaxed Fit",
    careInstructions: "Machine wash cold",
    description: "Bold sleeve stripes provide a sporty aesthetic. On sale with 30% discount!",
    productUrl: "/shop/product/4/sleeve-striped-t-shirt",
  },
  {
    id: "5",
    title: "Vertical Striped Shirt",
    category: "Shirts",
    section: "Top Selling",
    originalPrice: 265,
    discount: 20,
    finalPrice: 212,
    rating: 5.0,
    availableSizes: "Small, Medium, Large, X-Large",
    availableColors: "Light Green/White, Sky Blue/White",
    materialComposition: "100% Linen",
    fitType: "Slim Fit",
    careInstructions: "Hand wash or gentle cycle",
    description: "Breathable vertical striped linen shirt perfect for summer. 20% off!",
    productUrl: "/shop/product/5/vertical-striped-shirt",
  },
  {
    id: "6",
    title: "Courage Graphic T-shirt",
    category: "T-shirts",
    section: "Top Selling",
    originalPrice: 145,
    discount: 0,
    finalPrice: 145,
    rating: 4.0,
    availableSizes: "Small, Medium, Large",
    availableColors: "Orange, White, Black",
    materialComposition: "100% Cotton",
    fitType: "Regular Fit",
    careInstructions: "Machine wash cold",
    description: "Eye-catching graphic tee with typography on front.",
    productUrl: "/shop/product/6/courage-graphic-t-shirt",
  },
  {
    id: "7",
    title: "Loose Fit Bermuda Shorts",
    category: "Shorts",
    section: "Top Selling",
    originalPrice: 80,
    discount: 0,
    finalPrice: 80,
    rating: 3.0,
    availableSizes: "30, 32, 34, 36",
    availableColors: "Navy Blue, Khaki",
    materialComposition: "100% Cotton Twill",
    fitType: "Loose Fit",
    careInstructions: "Machine wash cold",
    description: "Relaxed fit knee-length shorts for everyday casual wear.",
    productUrl: "/shop/product/7/loose-fit-bermuda-shorts",
  },
  {
    id: "8",
    title: "Faded Skinny Jeans",
    category: "Jeans",
    section: "Top Selling",
    originalPrice: 210,
    discount: 0,
    finalPrice: 210,
    rating: 4.5,
    availableSizes: "28, 30, 32, 34",
    availableColors: "Light Wash Blue",
    materialComposition: "99% Cotton, 1% Spandex",
    fitType: "Skinny Fit",
    careInstructions: "Machine wash cold",
    description: "Trendy light-wash faded skinny jeans with flexible stretch.",
    productUrl: "/shop/product/8/faded-skinny-jeans",
  },
];

export async function fetchProductsFromSheet(forceRefresh = false): Promise<SheetProduct[]> {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && now - lastFetchTime < CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || "12bowF269PVShSoxXSR_NtbY_E_H2JI5j2_qbTLEbzd0";
    const accessToken = await getAccessToken();

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch spreadsheet rows: ${errorText}`);
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    if (rows.length < 2) {
      return DEFAULT_CATALOG_PRODUCTS;
    }

    // Row 0 is header: Product ID, Title, Category, Section, Original Price ($), Discount (%), Final Price ($), Rating (out of 5), Available Sizes, Available Colors, Material Composition, Fit Type, Care Instructions, Description, Product URL
    const products: SheetProduct[] = rows.slice(1).map((r) => {
      const id = r[0] || "";
      const title = r[1] || "";
      const category = r[2] || "";
      const section = r[3] || "";
      const originalPrice = parseFloat(r[4] || "0") || 0;
      const discount = parseFloat(r[5] || "0") || 0;
      const finalPrice = parseFloat(r[6] || "0") || originalPrice;
      const rating = parseFloat(r[7] || "0") || 0;
      const availableSizes = r[8] || "";
      const availableColors = r[9] || "";
      const materialComposition = r[10] || "";
      const fitType = r[11] || "";
      const careInstructions = r[12] || "";
      const description = r[13] || "";
      const rawUrl = r[14] || "";

      // Normalize URL to relative shop URL if local, e.g. /shop/product/1/slug
      let productUrl = rawUrl;
      try {
        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
          const parsed = new URL(rawUrl);
          productUrl = parsed.pathname;
        }
      } catch {
        productUrl = `/shop/product/${id}/${encodeURIComponent(title.replace(/\s+/g, "-"))}`;
      }

      return {
        id,
        title,
        category,
        section,
        originalPrice,
        discount,
        finalPrice,
        rating,
        availableSizes,
        availableColors,
        materialComposition,
        fitType,
        careInstructions,
        description,
        productUrl,
      };
    });

    if (products.length > 0) {
      cachedProducts = products;
      lastFetchTime = now;
      return products;
    }
    return DEFAULT_CATALOG_PRODUCTS;
  } catch (err: any) {
    console.warn("Failed to fetch live products from Google Sheets, using fallback catalog:", err.message);
    if (!cachedProducts || cachedProducts.length === 0) {
      cachedProducts = DEFAULT_CATALOG_PRODUCTS;
    }
    return cachedProducts;
  }
}
