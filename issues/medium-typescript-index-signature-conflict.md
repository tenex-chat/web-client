# TypeScript Index Signature Conflict in LLM Types

## Severity: Medium

## Description
There's a TypeScript compilation error due to conflicting index signatures in the LLM configuration types. The `LLMFileConfiguration` interface has an index signature that expects simple types (`string | number | boolean | undefined`), but `WebLLMConfiguration` extends it and tries to add complex object properties (`speech` and `tts`) that don't match the index signature constraint.

## Location
- `/src/types/llm.ts` lines 49-58
- `/src/lib/types.ts` line 58 (index signature definition)

## Error Messages
```
src/types/llm.ts(50,5): error TS2411: Property 'speech' of type '{ configuration: SpeechConfig; credentials: LLMCredentials; } | undefined' is not assignable to 'string' index type 'string | number | boolean | undefined'.
src/types/llm.ts(54,5): error TS2411: Property 'tts' of type '{ configuration: TTSConfig; credentials: LLMCredentials; } | undefined' is not assignable to 'string' index type 'string | number | boolean | undefined'.
```

## Recommended Fix
Consider one of these approaches:
1. Remove the index signature from `LLMFileConfiguration` and use explicit properties
2. Create a separate interface for web-specific configuration that doesn't extend `LLMFileConfiguration`
3. Update the index signature to allow object types: `[key: string]: any`

## Impact
- Build failures
- Type safety compromised
- May affect runtime behavior if type assertions are used

## Risk Assessment
Medium risk to fix - requires careful consideration of all usages of these types throughout the codebase.