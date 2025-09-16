Querying perplexity using sonar for: ElevenLabs official STT speech to text API endpoint 2025 with maxTokens: 21000
The official ElevenLabs Speech-to-Text (STT) API endpoint in 2025 uses their "Scribe" model, with the model ID **`scribe_v1`** for general use and an experimental improved version named **`scribe_v1_experimental`** also available. You make speech-to-text requests by specifying these model IDs in the API call for transcription[1][3][5].

Key details:
- The **main model ID** for general STT API usage is **`scribe_v1`**.
- An **experimental preview** model with enhanced performance is available as **`scribe_v1_experimental`**.
- The API supports transcription in 99 languages with features like auto-caption generation, editing transcripts, and aligning audio with video[2].
- Usage includes sending audio files (e.g., MP4) to the endpoint with parameters specifying the model and desired transcription settings[3].

Although ElevenLabs does not publish the exact URL of the STT API endpoint explicitly in the search results, it follows their general API pattern where you specify the model ID and send requests to their API base URL. The documentation and changelogs confirm that speech-to-text is now fully integrated and updated, with enhancements to parameter handling and alignment features[1][5].

If you want to get started:
- Use the base ElevenLabs API URL (usually something like `https://api.elevenlabs.io/v1/speech-to-text`) — check the latest official docs.
- Specify model ID as `"scribe_v1"` or `"scribe_v1_experimental"` in the request body/json.
- Provide your audio data and any additional parameters as per the API reference[3][5].

For the most accurate and up-to-date API endpoint, refer to ElevenLabs’s latest official API documentation on speech-to-text:

- **Model ID**: `scribe_v1` (stable), `scribe_v1_experimental` (preview)
- **Features**: Multilingual support, auto captions, transcript editing, audio-text alignment
- **Key platform**: ElevenLabs API platform (base URL and auth token required)

This summary is based on ElevenLabs changelogs, documentation, and recent tutorials as of 2025[1][2][3][5].