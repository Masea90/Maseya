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
  name: "get_product",
  title: "Get product by barcode",
  description:
    "Fetch a MASEYA product's full details (name, brand, category, ingredients, image) by barcode.",
  inputSchema: {
    barcode: z.string().trim().min(4).describe("Product barcode (EAN/UPC)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ barcode }) => {
    const sb = publicSupabase();
    const { data, error } = await sb
      .from("maseya_products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: `No product found for barcode ${barcode}` }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { product: data },
    };
  },
});
