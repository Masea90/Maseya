# MASEYA Rebuild — Personal Product Scanner

Pivot the app from a beauty/community/routine PWA into a focused **personal product scanner**: scan a barcode → get a 3-layer personalized analysis (general ingredients, naturalness, "is it for you?") powered by Open Food Facts, Open Beauty Facts, and Mira AI.

## What we keep
- Supabase auth + DB + RLS
- Mira AI chatbot (repurposed: explains scan results, profile-aware)
- PWA / service worker
- i18n (EN/ES/FR), Spanish becomes default
- Existing `profiles` table (extended with new health fields)

## What we remove
Community (`community_posts`, `post_comments`, `post_likes`, `post_reactions`, `user_follows`, `user_saved_posts`), routines (`routine_completions`, `custom_routine`, `routine-reminders` function, reminder UI), rewards (`point_transactions`, `user_badges`, `useRewards`), affiliates (`product_affiliate_links`, `affiliate_clicks`, admin affiliate pages), wishlist, discover/remedies pages, scan placeholders, onboarding quiz/guide/welcome (replaced).

## New navigation (4 tabs)
Scan (default) · History · Profile · Mira

## New screens
1. Welcome — "Tu piel, tu cuerpo, tus reglas." → Empezar
2. Onboarding (2 quick questions, saved to localStorage pre-auth)
3. Scanner — camera + barcode + "fotografiar ingredientes" fallback + recent scans strip
4. Result — global score circle + 3 expandable layers + Mira explanation + 3 alternatives
5. Soft-paywall registration sheet (after first scan; Google + email; "continuar sin cuenta" capped at 3 scans)
6. Full health profile (skin / hair / nutrition / general health, completion %)
7. History (filters, search)
8. Mira chat (profile + scan-history aware, suggested prompts)

## 3-layer scoring
- **Layer 1 — Ingredientes generales**: parse INCI / ingredients_text, flag known risky additives (parabens, sulfates, synthetic fragrance, EDTA, BHA/BHT, E-numbers blacklist) with green/orange/red.
- **Layer 2 — ¿Es natural?**: % natural ingredients, NOVA group (food) / processing level, organic certifications detected from labels_tags.
- **Layer 3 — ¿Es para ti?** (premium for non-trivial cases): cross-references user health profile (atopic skin → flag sulfates/fragrance; celiac → check gluten; pregnancy → flag retinoids/salicylic; allergies → flag matches).

## Data sources
- Open Food Facts: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Open Beauty Facts: `https://world.openbeautyfacts.org/api/v2/product/{barcode}.json`
- Fallback: photograph ingredients → Mira (Gemini multimodal) extracts INCI + analyzes
- Alternatives: OFF/OBF category search filtered by score + user profile compat

## Monetization
Free: 15 scans/mo, layers 1–2, 1 alt, 3-mo history.
Premium 3.99€/mo or 29.99€/yr: unlimited, layer 3, 3 alts, full history, offline saved, priority Mira.
Paywall surfaces at free limit or when tapping Layer 3.

→ **Payments**: I'll run `recommend_payment_provider` and use Lovable's built-in payments (Stripe or Paddle) — no API keys to set up.

## Database changes
New tables:
- `health_profiles` (1:1 with user, FKs to user_id) — skin_type[], skin_conditions[], skin_sensitivities[], hair_type, hair_condition, hair_concerns[], allergies[], diet, nutrition_goals[], pregnancy_or_lactation bool, completion_pct.
- `scan_history` — user_id, barcode, source ('off'|'obf'|'photo'), product_data jsonb, scores jsonb (layer1/2/3 + global), ai_explanation, scanned_at.
- `products_cache` — barcode PK, source, product_data jsonb, last_updated. Public read, service-role write.
- `scan_alternatives` — scan_id FK, alt_barcode, alt_data jsonb, reason.
- `subscriptions` — user_id, tier ('free'|'premium'), period ('monthly'|'yearly'), provider_customer_id, current_period_end.
- `monthly_scan_counts` — user_id, year_month, count (enforce free 15/mo limit).

All RLS: users access only own rows; `products_cache` public-read.

Removed tables (with cleanup migration): community_posts, post_comments, post_likes, post_reactions, user_follows, user_saved_posts, user_wishlist, routine_completions, point_transactions, user_badges, product_affiliate_links, affiliate_clicks. Drop related triggers/functions/storage policies.

## Edge functions
- Keep: `chat` (refocused system prompt: scanner expert, profile + history aware), `get-vapid-key`.
- New: `analyze-product` — takes barcode or photo + user profile, fetches OFF/OBF or runs Gemini vision on photo, computes 3-layer scores, returns analysis + alternatives. Writes to `scan_history` + `products_cache`.
- Remove: `routine-reminders`, `moderate-post`, `send-test-push`, `translate` (or keep translate if useful for OFF data — TBD).

## Design system update
Repaint tokens in `index.css` + `tailwind.config.ts`:
- primary `#2D6A4F` (deep green), secondary `#95D5B2` (mint), bg `#F8FAF9`, text `#1B1B1B`
- 16px radius, Inter font, subtle shadows
- Default language: Spanish

## Suggested phasing (each phase ≈ one prompt of work)

**Phase 1 — Foundation & cleanup**
- Migration: drop removed tables/functions/triggers, create new tables + RLS.
- Strip removed routes/pages/components/hooks/edge functions.
- Repaint design tokens + set Spanish default.
- New 4-tab BottomNav, new AppRoutes skeleton.

**Phase 2 — Onboarding + scanner UI shell**
- Welcome screen, 2-question onboarding (localStorage), Profile screen (full health profile form), Scanner screen with `@zxing/browser` barcode camera + photo fallback (UI only, mock result).

**Phase 3 — Scan engine**
- `analyze-product` edge function: OFF → OBF → photo+Gemini fallback, 3-layer scoring, alternatives query, persist to `scan_history` + `products_cache`.
- Result screen wired to real data, Mira explanation bubble, alternatives cards.

**Phase 4 — Auth gate, history, Mira refresh**
- Soft paywall sheet after 1st scan (Google + email), 3-scan anonymous cap.
- History screen with filters + search.
- Refocus Mira system prompt (scanner expert, reads profile + scan_history).

**Phase 5 — Monetization + polish**
- Lovable payments (Stripe/Paddle) for 3.99€/mo and 29.99€/yr, `subscriptions` table, free-tier limit enforcement, Layer 3 paywall trigger, offline saved scans.

## Questions before I start
1. **Confirm destructive cleanup.** All community posts, comments, follows, wishlists, points, badges, routine completions, and affiliate data will be **permanently deleted**. Profile fields stay; their non-scanner attributes (goals[], hair_type from old quiz, etc.) get migrated where sensible. OK?
2. **Default language ES?** Switch app default from EN to ES (current users keep their saved preference).
3. **Anonymous scans before signup**: spec says "no login, direct entry" then soft-paywall after 1st scan with a 3-scan cap. Implementing that needs either (a) anonymous Supabase sessions or (b) localStorage-only scan storage until signup. I'll go with (b) — simpler, no anon-auth complexity, scans migrate to the user record on signup. OK?
4. **Phase 1 only now, or ship all 5 in sequence?** Recommend phase-by-phase so you can test each step; full rebuild in one go is high-risk.

Reply with answers (or just "go phase 1") and I'll start.