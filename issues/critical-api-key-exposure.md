# CRITICAL: API Key Security Vulnerability

## Severity: CRITICAL

## Summary
Direct exposure and insecure storage of API keys on the client-side poses severe security risks.

## Details

### 1. API Key Exposure in Frontend Bundle
- **Location:** 
  - `src/hooks/useSpeechToText.ts` (line 5)
  - `src/hooks/useLLM.ts` (line 6)
- **Issue:** OpenAI API keys are accessed via `import.meta.env.VITE_OPENAI_API_KEY`, making them directly readable in the client-side JavaScript bundle.

### 2. Unencrypted Storage in localStorage
- **Location:** 
  - `src/stores/llmConfig.ts` (lines 50-51)
  - `src/components/settings/LLMSettings.tsx` (line 245)
- **Issue:** API keys for Murf.ai and other LLM services are stored unencrypted in `localStorage`, making them vulnerable to Cross-Site Scripting (XSS) attacks.

## Impact
- Unauthorized API usage leading to unexpected billing
- Compromise of third-party service accounts
- Potential data theft or abuse
- Complete exposure of API keys to anyone who can inspect the browser

## Recommended Solution

### Immediate Actions Required:
1. **Rotate all exposed API keys immediately**
2. **Remove all API keys from environment variables that are prefixed with `VITE_`**

### Long-term Solution:
1. **Implement a secure backend proxy service**
   - Create a backend API that handles all third-party API calls
   - Store API keys securely on the server-side only
   - Authenticate users before proxying their requests
   - Never expose API keys to the client

2. **Example Architecture:**
   ```
   Client → Backend Proxy (with auth) → Third-party APIs
   ```

3. **For user-provided API keys:**
   - If users must provide their own API keys, clearly warn them about the security implications
   - Consider using a more secure storage mechanism than localStorage
   - Implement proper encryption if keys must be stored client-side

## Priority
This must be addressed immediately before any production deployment. The current implementation exposes all API keys to public access.