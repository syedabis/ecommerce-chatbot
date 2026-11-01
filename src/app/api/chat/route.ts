import { NextRequest, NextResponse } from "next/server";
import { fetchProductsFromSheet, SheetProduct } from "@/lib/googleSheets";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function buildSystemPrompt(products: SheetProduct[]): string {
  const catalogText = products
    .map(
      (p) =>
        `- [ID: ${p.id}] "${p.title}" | Category: ${p.category} | Section: ${p.section}
  Price: $${p.finalPrice}${p.discount > 0 ? ` (Originally $${p.originalPrice}, ${p.discount}% OFF)` : ""}
  Rating: ⭐ ${p.rating}/5
  Sizes: ${p.availableSizes} | Colors: ${p.availableColors}
  Material: ${p.materialComposition} | Fit: ${p.fitType}
  Care: ${p.careInstructions}
  Description: ${p.description}
  URL: ${p.productUrl}`
    )
    .join("\n\n");

  return `You are "ShopCo Stylist & AI Assistant", an expert personal fashion stylist and shopping consultant for the Shop.co e-commerce store.

CURRENT LIVE PRODUCT CATALOG (Fetched directly from Google Sheets):
${catalogText}

YOUR ROLE & BEHAVIOR GUIDELINES:
1. MAXIMUM WORD COUNT: Your entire response MUST be 50 words or fewer. Keep answers short, direct, punchy, and helpful. Never exceed 50 words.
2. Provide personalized fashion advice and product recommendations using the catalog above.
3. When recommending a product, state its name, price ($finalPrice, noting discount if on sale), and include a clickable Markdown link using the exact relative URL from the catalog: e.g. [Product Title](/shop/product/ID/slug). Never output literal text "(URL)".
4. If a customer asks about fit, sizing, or materials, refer accurately to the catalog details.
5. If an item is not in the catalog, briefly suggest the closest alternative.`;
}

// Call OpenAI Chat Completions API
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const openAiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openAiMessages,
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error?.message || `OpenAI API returned status ${response.status}`
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from OpenAI");
  }
  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }
    const messages: ChatMessage[] = body?.messages || [];

    if (!messages.length) {
      return NextResponse.json(
        { error: "No messages provided in the request" },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

    if (!openAiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    // Fetch live product catalog from Google Sheet (falls back automatically to default catalog)
    let products: SheetProduct[] = [];
    try {
      products = await fetchProductsFromSheet();
    } catch (sheetError: any) {
      console.error("Error fetching Google Sheet products:", sheetError);
    }

    const systemPrompt = buildSystemPrompt(products);

    const replyText = await callOpenAI(
      openAiKey,
      openAiModel,
      systemPrompt,
      messages
    );

    return NextResponse.json({
      reply: replyText,
      productsCount: products.length,
      provider: "openai",
      model: openAiModel,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat message." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const products = await fetchProductsFromSheet();
    return NextResponse.json({
      status: "online",
      provider: "openai",
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      productsCount: products.length,
      sampleProducts: products.slice(0, 3).map((p) => ({
        id: p.id,
        title: p.title,
        finalPrice: p.finalPrice,
        category: p.category,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
