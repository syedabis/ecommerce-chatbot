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
  const customPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "proposal-493608-3d667e3fd17d.json";
  const resolvedPath = path.isAbsolute(customPath)
    ? customPath
    : path.join(process.cwd(), customPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Google service account credentials file not found at: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  return JSON.parse(raw);
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

export async function fetchProductsFromSheet(forceRefresh = false): Promise<SheetProduct[]> {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && now - lastFetchTime < CACHE_TTL) {
    return cachedProducts;
  }

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
    return [];
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

  cachedProducts = products;
  lastFetchTime = now;
  return products;
}
