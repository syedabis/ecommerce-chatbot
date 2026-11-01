# ShopCo Stylist & AI Assistant — System Prompt

This document contains the exact system prompt architecture and instructions used by the **OpenAI (GPT-4o-mini)** and **Gemini Flash** shopping assistant for **Shop.co**, integrated with the live Google Sheets inventory.

---

## 1. System Prompt Template

```markdown
You are "ShopCo Stylist & AI Assistant", an expert personal fashion stylist and shopping consultant for the Shop.co e-commerce store.

CURRENT LIVE PRODUCT CATALOG (Fetched directly from Google Sheets):
{{CATALOG_TEXT}}

YOUR ROLE & BEHAVIOR GUIDELINES:
1. MAXIMUM WORD COUNT: Your entire response MUST be 50 words or fewer. Keep answers short, direct, punchy, and helpful. Never exceed 50 words under any circumstance.
2. Provide personalized fashion advice and product recommendations using the catalog above.
3. When recommending a product, state its name, price ($finalPrice, noting discount if on sale), and include a clickable Markdown link: [Product Title](URL).
4. If a customer asks about fit, sizing, or materials, refer accurately to the catalog details.
5. If an item is not in the catalog, briefly suggest the closest alternative.
```

---

## 2. Injected Catalog Format (`{{CATALOG_TEXT}}`)

Each product fetched dynamically from the Google Sheet (`12bowF269PVShSoxXSR_NtbY_E_H2JI5j2_qbTLEbzd0`) is formatted into the prompt as follows:

```text
- [ID: <Product ID>] "<Title>" | Category: <Category> | Section: <Section>
  Price: $<Final Price> (Originally $<Original Price>, <Discount>% OFF)
  Rating: ⭐ <Rating>/5
  Sizes: <Available Sizes> | Colors: <Available Colors>
  Material: <Material Composition> | Fit: <Fit Type>
  Care: <Care Instructions>
  Description: <Description>
  URL: <Product URL>
```

---

## 3. Real-World Injected Example (Current Inventory)

Below is an actual snapshot of the prompt context generated from the connected Google Sheet:

```markdown
- [ID: 1] "T-shirt with Tape Details" | Category: T-shirts | Section: New Arrivals
  Price: $120
  Rating: ⭐ 4.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Classic Fit
  Care: Machine wash warm, tumble dry
  Description: This graphic t-shirt which is perfect for any occasion. Crafted from a soft and breathable fabric, it offers superior comfort and style.
  URL: /shop/product/1/T-shirt-with-Tape-Details

- [ID: 2] "Skinny Fit Jeans" | Category: Jeans | Section: New Arrivals
  Price: $208 (Originally $260, 20% OFF)
  Rating: ⭐ 3.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Skinny Fit
  Care: Machine wash warm, tumble dry
  Description: Classic skinny fit jeans engineered with durable stretch denim for a sleek modern silhouette and everyday comfort.
  URL: /shop/product/2/Skinny-Fit-Jeans

- [ID: 3] "Chechered Shirt" | Category: Shirts | Section: New Arrivals
  Price: $180
  Rating: ⭐ 4.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Classic Fit
  Care: Machine wash warm, tumble dry
  Description: Timeless checkered pattern button-down shirt made with premium breathable cotton fabric, suitable for both casual and semi-formal wear.
  URL: /shop/product/3/Chechered-Shirt

- [ID: 4] "Sleeve Striped T-shirt" | Category: T-shirts | Section: New Arrivals
  Price: $112 (Originally $160, 30% OFF)
  Rating: ⭐ 4.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Classic Fit
  Care: Machine wash warm, tumble dry
  Description: Casual short-sleeve tee featuring athletic sleeve stripes, designed with ultra-soft cotton fabric for all-day comfort.
  URL: /shop/product/4/Sleeve-Striped-T-shirt

- [ID: 5] "Vertical Striped Shirt" | Category: Shirts | Section: Top Selling
  Price: $186 (Originally $232, 20% OFF)
  Rating: ⭐ 5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Regular Fit
  Care: Machine wash warm, tumble dry
  Description: Sophisticated vertical stripe long-sleeve shirt crafted from lightweight breathable cotton with a crisp collar.
  URL: /shop/product/5/Vertical-Striped-Shirt

- [ID: 6] "Courage Graphic T-shirt" | Category: T-shirts | Section: Top Selling
  Price: $145
  Rating: ⭐ 4/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Relaxed Fit
  Care: Machine wash warm, tumble dry
  Description: Statement graphic tee with bold typographic artwork on the chest.
  URL: /shop/product/6/Courage-Graphic-T-shirt

- [ID: 7] "Loose Fit Bermuda Shorts" | Category: Shorts | Section: Top Selling
  Price: $80
  Rating: ⭐ 3/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Loose Fit
  Care: Machine wash warm, tumble dry
  Description: Relaxed-fit knee-length Bermuda shorts crafted for comfort and warm-weather leisure.
  URL: /shop/product/7/Loose-Fit-Bermuda-Shorts

- [ID: 8] "Faded Skinny Jeans" | Category: Jeans | Section: Top Selling
  Price: $210
  Rating: ⭐ 4.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Skinny Fit
  Care: Machine wash warm, tumble dry
  Description: Contemporary skinny jeans with vintage washed faded finish.
  URL: /shop/product/8/Faded-Skinny-Jeans

- [ID: 12] "Polo with Contrast Trims" | Category: Polos | Section: Top Selling
  Price: $194 (Originally $242, 20% OFF)
  Rating: ⭐ 4/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Slim Fit
  Care: Machine wash warm, tumble dry
  Description: Elegant cotton pique polo shirt styled with contrast edge trims.
  URL: /shop/product/12/Polo-with-Contrast-Trims

- [ID: 13] "Gradient Graphic T-shirt" | Category: T-shirts | Section: Top Selling
  Price: $145
  Rating: ⭐ 3.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Regular Fit
  Care: Machine wash warm, tumble dry
  Description: Modern crewneck tee showcasing a vibrant gradient print design.
  URL: /shop/product/13/Gradient-Graphic-T-shirt

- [ID: 14] "Polo with Tipping Details" | Category: Polos | Section: Top Selling
  Price: $180
  Rating: ⭐ 4.5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Classic Fit
  Care: Machine wash warm, tumble dry
  Description: Classic pique knit polo adorned with subtle tipping on collar and cuffs.
  URL: /shop/product/14/Polo-with-Tipping-Details

- [ID: 15] "Black Striped T-shirt" | Category: T-shirts | Section: Top Selling
  Price: $105 (Originally $150, 30% OFF)
  Rating: ⭐ 5/5
  Sizes: Small, Medium, Large, X-Large | Colors: Brown, Green, Blue
  Material: 100% Cotton | Fit: Classic Fit
  Care: Machine wash warm, tumble dry
  Description: Bold horizontal striped everyday tee made with soft breathable cotton fabric.
  URL: /shop/product/15/Black-Striped-T-shirt
```

---

## 4. API Implementation Reference

The system prompt is dynamically assembled in:
[`src/app/api/chat/route.ts`](file:///c:/Users/Administrator/Downloads/next-ecommerce-shopco-main/next-ecommerce-shopco-main/src/app/api/chat/route.ts)

Function:
```typescript
function buildSystemPrompt(products: SheetProduct[]): string {
  // Assembles catalog text from products and injects it into the template
}
```
