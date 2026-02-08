

## Connect MASEYA Chatbot (Mira) to AI

This plan replaces the hardcoded chatbot responses with real AI-powered conversations using Lovable AI. The chatbot "Mira" will become a true beauty assistant that understands the user's profile (skin concerns, hair type, goals, sensitivities, climate, etc.) and responds with personalized skincare and haircare advice in the user's chosen language.

### What Changes

1. **New backend function** -- A `chat` edge function that receives the user's message + profile context, builds a beauty-expert system prompt, and streams the AI response back in real time.

2. **Updated chatbot component** -- The `Chatbot.tsx` component will stream tokens from the AI instead of showing canned replies. Users will see the response appear word-by-word with a typing indicator.

3. **Conversation memory** -- The full conversation history is sent with each request so Mira remembers what was discussed earlier in the session.

### How It Works

```text
User types message
       |
       v
  Chatbot.tsx  ──(POST with messages + profile)──>  Edge Function /chat
       |                                                    |
       |                                          Builds system prompt with
       |                                          user profile context
       |                                                    |
       |                                          Calls Lovable AI Gateway
       |                                          (google/gemini-3-flash-preview)
       |                                                    |
       <────────── SSE stream (token by token) ─────────────
       |
  Renders tokens as they arrive
```

---

### Technical Details

#### 1. Create Edge Function: `supabase/functions/chat/index.ts`

- Accepts `{ messages, userProfile }` in the request body
- Builds a detailed system prompt that includes:
  - Mira's persona (friendly beauty expert for MASEYA app)
  - The user's skin concerns, hair type, hair concerns, goals, sensitivities, age range, climate, and country
  - The product catalog summary (names, brands, categories, tags) so Mira can recommend real products from the app
  - Instruction to respond in the user's language (en/fr/es)
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `stream: true` using `google/gemini-3-flash-preview`
- Returns the stream directly to the client
- Handles 429 (rate limit) and 402 (payment required) errors gracefully

#### 2. Update `supabase/config.toml`

- Add the `chat` function configuration with `verify_jwt = false` (public chatbot, no auth required)

#### 3. Update `src/components/chat/Chatbot.tsx`

- Add `isLoading` state to show a typing indicator while streaming
- Convert `handleSend` to an async function that:
  - Adds the user message to the list
  - Builds the `messages` array in OpenAI format (role: user/assistant) from conversation history
  - Sends the user profile context alongside messages
  - Streams the response using SSE parsing (line-by-line, handling `[DONE]`, partial JSON, CRLF)
  - Updates the bot message content progressively as tokens arrive
- Add a loading/typing indicator (animated dots) while waiting for the first token
- Handle errors (network failure, rate limiting) with user-friendly messages
- Auto-scroll to the bottom as new content streams in
- Disable input while a response is streaming

#### 4. Add i18n keys

- Add translation keys for error states: `chatbotError`, `chatbotRateLimit`, `chatbotTyping`
- Translations for English, Spanish, and French

### System Prompt Design

The system prompt will make Mira a knowledgeable beauty assistant who:
- Knows the user's exact profile (skin concerns, hair type, etc.)
- Can recommend products from the MASEYA catalog by name
- Responds in the user's preferred language
- Stays focused on skincare, haircare, and natural beauty
- Uses a warm, friendly tone with occasional emojis
- Provides actionable, personalized advice
- Never gives medical advice -- redirects to dermatologists when appropriate

### Error Handling

- **Network errors**: Show a friendly "Could not connect" message in the chat
- **Rate limiting (429)**: Show "Please wait a moment before sending another message"
- **Payment required (402)**: Show a generic error message
- **Streaming failures**: Gracefully fall back to showing whatever content was received

