# Resolved: Speech-to-Text API Key Configuration Issue

**Status:** ✅ Resolved  
**Date Resolved:** 2025-08-15  
**Severity:** Medium  
**Component:** Speech-to-Text (STT) Feature  

## Issue Description

The speech-to-text feature was failing to recognize configured OpenAI API keys. Users reported:
- Console warning: "OpenAI API key not configured, skipping transcription"
- No user-visible error notifications when transcription failed
- API key was properly configured in Settings > AI > Speech-to-Text but not being read

## Root Cause

The `useSpeechToText` hook was looking for the API key in the wrong location:
- **Incorrect:** `import.meta.env.VITE_OPENAI_API_KEY` (environment variable only)
- **Correct:** `localStorage.getItem('llm-configs')` (where settings page stores keys)

## Solution Implemented

### 1. Fixed API Key Lookup (src/hooks/useSpeechToText.ts)
- Updated hook to read from localStorage `llm-configs` 
- Added fallback to environment variable for backwards compatibility
- Properly parses the LLM provider settings array to find OpenAI config

### 2. Enhanced Error Notifications
- Added toast notifications with clear error messages
- Included actionable "Go to Settings" buttons for API key issues
- Specific error messages for common HTTP status codes (401, 429, 400)
- Improved logging using the logger utility

### 3. Better Error Handling in VoiceDialog (src/components/dialogs/VoiceDialog.tsx)
- Transcription and upload failures handled independently
- Users informed when only one service fails
- More descriptive error messages with troubleshooting suggestions

### 4. Fixed TypeScript Issue (src/components/settings/STTSettings.tsx)
- Corrected `getWaveBlob` function call with proper parameters
- Second parameter is boolean for 32-bit float, not options object

## Files Modified

1. `/src/hooks/useSpeechToText.ts` - Core fix for API key lookup and error handling
2. `/src/components/dialogs/VoiceDialog.tsx` - Improved error handling and user feedback
3. `/src/components/settings/STTSettings.tsx` - Fixed TypeScript issue with getWaveBlob

## Testing Verification

- ✅ API key correctly read from localStorage
- ✅ Toast notifications appear for missing/invalid API keys
- ✅ Specific error messages for different failure scenarios
- ✅ Action buttons navigate to correct settings pages
- ✅ Build passes without TypeScript errors
- ✅ Independent handling of transcription vs upload failures

## User Impact

- Users now receive clear, actionable feedback when API key is missing or invalid
- No more silent failures - all errors are properly communicated
- Easier troubleshooting with specific error messages
- Better integration with existing settings system

## Prevention Measures

To prevent similar issues in the future:
1. Always verify where settings are stored before reading them
2. Provide user-visible error notifications for all failure cases
3. Include actionable remediation steps in error messages
4. Test integration between settings pages and feature usage