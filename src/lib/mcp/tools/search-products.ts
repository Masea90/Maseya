import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function publicSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search MASEYA's product catalog (food & cosmetics) by name or brand. Returns matching products with barcode, name, brand, category, and image.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Product name or brand to search for."),
    category: z
      .enum(["food", "cosmetic"])
      .optional()
      .describe("Optional filter: 'food' or 'cosmetic'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }) => {
    const sb = publicSupabase();
    let q = sb
      .from("maseya_products")
      .select("barcode, product_name, brand, category, image_url, scan_count, verified")
      .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
      .order("scan_count", { ascending: false })
      .limit(limit ?? 10);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
