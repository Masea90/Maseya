import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProductsTool from "./tools/search-products";
import getProductTool from "./tools/get-product";
import listMyScansTool from "./tools/list-my-scans";

// Direct Supabase issuer host (not the Lovable Cloud proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "maseya-mcp",
  title: "KHARM",
  version: "0.1.0",
  instructions:
    "KHARM tools for natural beauty & food product safety. Use `search_products` to find products by name/brand, `get_product` to fetch a product by barcode, and `list_my_scans` to read the signed-in user's scan history.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProductsTool, getProductTool, listMyScansTool],
});
