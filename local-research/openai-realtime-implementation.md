Querying perplexity using sonar for: OpenAI Realtime API WebSocket implementation details event types client server session management authentication integration examples React TypeScript with maxTokens: 21000
OpenAI's Realtime API enables real-time interactions with GPT models over WebSockets, using JSON event messages for sending and receiving data. The client establishes a WebSocket connection to the `/realtime` endpoint, authenticates with an API key, and manages a single session per connection that automatically creates a default conversation (multiple conversations concurrently are not supported). The session handles input (e.g., audio via voice activity detection) and output generation asynchronously through event-driven messages. Authentication is done via a bearer token in the WebSocket headers, and events like `conversation.updated` allow incremental processing of model responses including audio and transcription data.

### Key Implementation Details

- **Connection and Session**:  
  - Connect to `wss://api.openai.com/v1/realtime` with query parameters like `intent=transcription`.  
  - Authentication uses an API key in the `Authorization: Bearer` header.  
  - One WebSocket connection corresponds to one session, which manages a single conversation internally.  
  - Sessions can be updated dynamically with configuration, such as setting instructions, audio transcription model, voice parameters, or voice activity detection (VAD) mode (`server_vad`) from the client side.

- **Event Types** (JSON-based messages sent both client → server and server → client):  
  - **`response.create`**: Client-initiated event that starts a new response from the assistant.  
  - **`conversation.updated`**: Sent by the server to deliver partial or incremental response data, including text, audio chunks, or function calls.  
  - **`item` and `content_part`**: Messages in the response can be split into items and content parts to represent multiple modalities (text and audio) concurrently and asynchronously.  
  - Other internal configuration events manage input methods and output generation.

- **Session Management**:  
  - The session accumulates input events until a response starts.  
  - VAD (Voice Activity Detection) can be client-driven or server-driven, controlling when audio input starts/stops.  
  - Sessions can be updated post-connection with new instructions or voice preferences without reconnecting.

- **Authentication**:  
  - Use the `Authorization: Bearer YOUR_API_KEY` HTTP header on WebSocket connection.  
  - Optional headers can include organization or project identifiers.  
  - A special beta protocol header `openai-beta.realtime-v1` is required.

- **Integration Example in React + TypeScript** (conceptual):  
  ```typescript
  import React, { useEffect, useRef } from "react";

  const OpenAIRealtimeWS: React.FC = () => {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
      const url = "wss://api.openai.com/v1/realtime?intent=transcription";
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

      ws.current = new WebSocket(url, [
        "realtime",
        `Authorization: Bearer ${apiKey}`,
        "openai-beta.realtime-v1",
      ]);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        // Optionally send a message to start conversation etc.
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Event received:", data);
        // Handle conversation.updated or other event types here
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket closed");
      };

      return () => {
        ws.current?.close();
      };
    }, []);

    return <div>OpenAI Realtime WebSocket Demo</div>;
  };

  export default OpenAIRealtimeWS;
  ```

- **Additional Notes**:  
  - For browsers, WebRTC is recommended over raw WebSocket for audio streaming due to browser environment constraints.  
  - Node.js or server environments can use standard WebSocket libraries to interface with the API.  
  - The openai API supports concurrent modalities (text, audio, transcription) managed via the protocol’s event and item structure.

This detailed structure and workflow are based on latest references in OpenAI's realtime docs and Azure AI Foundry examples dated mid-2025[1][2][3][5].