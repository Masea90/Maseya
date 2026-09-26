// Shared caller identification, DB-backed usage quotas and the catalog write
// rule for maseya_products. Used by extract-ingredients, mira-analyze and
// enrich-products.
import { createClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type Client = any;

export type Caller =
  | { kind: "anon"; uid: null; isAdmin: false }
  | { kind: "user"; uid: string; isAdmin: boolean };

const anonKeys = (): string[] => {
  const keys = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
  ].filter((k): k is string => Boolean(k));
  const list = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (list) {
    try {
      const parsed = JSON.parse(list);
      if (Array.isArray(parsed)) keys.push(...parsed.filter((k): k is string => typeof k === "string"));
      else if (parsed && typeof parsed === "object") {
        keys.push(...Object.values(parsed).filter((k): k is string => typeof k === "string"));
      }
    } catch {
      keys.push(...list.split(",").map((k) => k.trim()).filter(Boolean));
    }
  }
  return keys;
};

export const serviceClient = (): Client =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

/** Exact publishable key → anon; verified user JWT (sub) → user; anything else → null (401). */
export async function resolveCaller(req: Request, admin: Client): Promise<Caller | null> {
  const h = req.headers.get("Authorization") ?? "";
  if (!h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  if (anonKeys().includes(token)) return { kind: "anon", uid: null, isAdmin: false };
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data, error } = await client.auth.getClaims(token);
    const sub = data?.claims?.sub;
    if (error || typeof sub !== "string" || !sub) return null;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: sub, _role: "admin" });
    return { kind: "user", uid: sub, isAdmin: isAdmin === true };
  } catch {
    return null;
  }
}

/** Platform-set client IP; null when it cannot be determined reliably. */
export function clientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last; // appended by the platform proxy, not the client
  }
  return null;
}

async function hashIp(ip: string): Promise<string> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "maseya";
  const data = new TextEncoder().encode(`${key}|${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface QuotaLimits { user: number; ip: number; globalAnon: number }

/** Returns true if allowed (and counted). Anonymous traffic always counts against global:anon. */
export async function consumeQuota(
  admin: Client, req: Request, caller: Caller, fn: string, limits: QuotaLimits,
): Promise<boolean> {
  const subjects: string[] = [];
  const caps: number[] = [];
  if (caller.kind === "user") {
    if (caller.isAdmin) return true;
    subjects.push(`u:${caller.uid}`); caps.push(limits.user);
  } else {
    subjects.push("global:anon"); caps.push(limits.globalAnon);
    const ip = clientIp(req);
    if (ip) { subjects.push(`ip:${await hashIp(ip)}`); caps.push(limits.ip); }
  }
  const { data, error } = await admin.rpc("consume_usage_quota", { p_fn: fn, p_subjects: subjects, p_limits: caps });
  if (error) { console.error("[quota] rpc failed", error.message); return false; }
  return data === true;
}

// ---------- Catalog write rule ---------------------------------------------

const FILLABLE = ["ingredients_text", "product_name", "brand", "nutriments", "image_url"] as const;
const PLACEHOLDER_NAMES = new Set(["producto sin nombre", "producto fotografiado"]);

const isEmpty = (field: string, v: unknown): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" || (field === "product_name" && PLACEHOLDER_NAMES.has(t.toLowerCase()));
  }
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
};

export type WriteResult = "created" | "updated" | "unchanged" | "denied" | "error";

/**
 * - New barcode: anyone may create (verified=false, submitted_by=uid|null).
 * - Existing row: anon → never; verified=true → admin only;
 *   user → only fill empty FILLABLE fields (never last_enriched_at etc.);
 *   admin → unrestricted, verified rows included.
 * `fields` = values for an existing/new row; `createOnly` = extra columns used only on insert.
 * `imageUrl` is resolved lazily so no file is uploaded unless it will be stored.
 */
export async function writeProduct(
  admin: Client,
  caller: Caller,
  barcode: string,
  fields: Record<string, unknown>,
  createOnly: Record<string, unknown>,
  imageUrl?: () => Promise<string | null>,
): Promise<WriteResult> {
  const { data: existing, error: selErr } = await admin
    .from("maseya_products").select("*").eq("barcode", barcode).maybeSingle();
  if (selErr) { console.error("[write] select failed", selErr.message); return "error"; }

  if (!existing) {
    const row: Record<string, unknown> = { barcode, ...createOnly, ...fields, verified: false, submitted_by: caller.uid };
    if (imageUrl) { const u = await imageUrl(); if (u) row.image_url = u; }
    const { data: ins, error } = await admin.from("maseya_products")
      .upsert(row, { onConflict: "barcode", ignoreDuplicates: true }).select("barcode");
    if (error) { console.error("[write] insert failed", error.message); return "error"; }
    return ins && ins.length ? "created" : "unchanged";
  }

  if (caller.kind === "anon") return "denied";
  if (existing.verified && !caller.isAdmin) return "denied";

  let patch: Record<string, unknown>;
  if (caller.isAdmin) {
    patch = { ...fields };
    if (imageUrl) { const u = await imageUrl(); if (u) patch.image_url = u; }
  } else {
    patch = {};
    for (const f of FILLABLE) {
      if (f === "image_url") continue;
      if (f in fields && !isEmpty(f, fields[f]) && isEmpty(f, existing[f])) patch[f] = fields[f];
    }
    if (imageUrl && isEmpty("image_url", existing.image_url)) {
      const u = await imageUrl(); if (u) patch.image_url = u;
    }
  }
  if (!Object.keys(patch).length) return "unchanged";
  const { error } = await admin.from("maseya_products").update(patch).eq("barcode", barcode);
  if (error) { console.error("[write] update failed", error.message); return "error"; }
  return "updated";
}
