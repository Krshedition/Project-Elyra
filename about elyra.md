## 1. Project Overview
Project Elyra is a highly customized, Windows-specific virtual AI desktop assistant designed for a specific user (Krish Bhutiya). Operating as a floating, frameless desktop widget, it utilizes the Gemini Multimodal Live API to provide ultra-low latency conversational AI with real-time vision capabilities. Elyra's core value proposition is full native OS automation (launching apps, injecting keystrokes, managing files) via custom C++ node addons, combined with a persistent, long-term memory system backed by a local SQLite database to organically learn user facts and session summaries over time.

## 2. Tech Stack
- **Electron (v42.2.0)**: Desktop application shell, handling deep OS integration, IPC bridging, and the transparent, frameless, click-through UI overlay.
- **React (v19) + Vite**: Frontend rendering layer and blazing-fast development server.
- **TailwindCSS + Framer Motion**: Core UI styling, responsive design, and smooth micro-animations for the widget and memory manager states.
- **@google/genai (v2.6.0)**: Official Google SDK, specifically leveraging `gemini-3.1-flash-live-preview` via WebSockets for real-time Bidi (bidirectional) audio/video streaming, and `gemini-2.5-flash` for asynchronous memory extraction.
- **node-addon-api (N-API)**: Used to compile `elyra_automation.node`, a custom C++ native binary that bypasses Node's limitations to directly interface with Windows Win32 APIs for precise window focusing (via `AttachThreadInput`), keystroke injection, process killing, and native CoreAudio volume control (`IAudioEndpointVolume`).
- **better-sqlite3**: Synchronous, high-performance local SQLite database engine used to store long-term context (`user_facts` and `sessions`) without cloud database overhead.

## 3. Architecture
### System Diagram
```text
[ Windows OS ] <--> [ C++ Native Addon (elyra_automation.node) ]
                           ^
                           | (N-API)
[ Electron Main Process ] (IPC Hub, SQLite Memory DB, Window Manager)
                           ^
                           | (Context Bridge / IPC)
[ Electron Renderer (React) ] <--> [ WaveWidget UI & Memory Manager ]
                           ^
                           | (WebSocket / WebRTC)
[ Gemini Live API (Google Cloud) ]
```

### End-to-End Voice Flow
1. **Input**: `AudioRecorder` captures raw microphone data.
2. **Streaming**: Base64 encoded PCM16 (16kHz) chunks are streamed continuously via the WebSocket `realtimeInput` payload.
3. **Processing**: Google's server performs Voice Activity Detection (VAD) and STT internally, triggering a `modelTurn`.
4. **Response**: The server streams back Base64 PCM16 (24kHz) audio data.
5. **Output**: The React client receives `inlineData.data`, decodes it, and feeds it into the `AudioStreamer` for playback.

### WebSocket Streaming & Reconnection Logic
The connection directly hits `wss://generativelanguage.googleapis.com/.../BidiGenerateContent`. The application implements a highly robust, state-aware session-swapping architecture to seamlessly bypass Gemini's strict 9-10 minute session time limits:
- The server sends `sessionResumptionUpdate` tokens, which are cached in memory.
- At 8.5 minutes, a `swapReady` flag is armed. The React UI continuously monitors the conversational state and waits until both the user and the AI are perfectly silent (`state === 'listening'`).
- Once a gap in conversation is found, it abruptly closes the WebSocket and instantly reconnects, passing the cached handle in the `sessionResumption` config, creating a completely gapless and invisible session restart.
- To prevent data loss when the user manually closes the app, the client asynchronously offloads the current session transcript to the main Electron process via the `process-memory-worker` IPC. Electron intercepts the `before-quit` app event to keep the process alive just long enough for the Gemini API to extract long-term memory facts before truly shutting down.

### Vision-Based Screen Capture
WebRTC is utilized via `desktopCapturer.getSources()` (fetching the primary screen ID via IPC). `navigator.mediaDevices.getUserMedia` captures the desktop feed into a hidden HTML `<video>` element. 
Instead of streaming heavy continuous video, the system uses an optimized event-driven diffing mechanism: a `<canvas>` draws the video frame every 4 seconds, downscales it to 64x36, and computes a pixel diff against the previous frame. If less than 3% of the screen has changed, it drops the frame entirely. If there is a change, it sends the full compressed JPEG as a `realtimeInput` image chunk. This dramatically reduces idle bandwidth and completely eliminates UI micro-stutters.

## 4. Module/File Map
- `electron/main.ts`: Main process entry; initializes transparent windows, handles IPC routing, and bootstraps memory. (Complete)
- `electron/memory.ts`: SQLite wrapper managing `user_facts` and `sessions` tables; exposes CRUD operations for the memory engine. (Complete)
- `electron/action_handler.ts`: Native wrapper executing OS commands via the C++ `elyra_automation.node` binary; includes execution delays for UI rendering. (Complete)
- `electron/validator.ts`: Security layer that sanitizes and validates all AI-generated OS action requests before execution. (Complete)
- `electron/preload.ts`: Electron ContextBridge exposing safe IPC methods (`desktopAction`, `getSystemContext`, etc.) to the React renderer. (Complete)
- `src/App.tsx`: Root React component orchestrating the dynamic window sizing, layout, and Framer Motion transitions. (Complete)
- `src/hooks/useLiveSession.ts`: Massive, monolithic hook managing the Gemini WebSocket lifecycle, WebRTC screen capture, audio streaming, and tool response execution. (Complete)
- `src/WaveWidget.tsx`: The primary visual interface featuring a floating, animated orb/waveform. (Complete)
- `src/components/MemoryManager.tsx`: User-facing UI modal for viewing, editing, and manually adding long-term facts to the SQLite database. (Complete)
- `build/Release/elyra_automation.node`: Compiled C++ Native Addon executing low-level Windows API commands. (Complete)

## 5. Key Design Decisions & Tradeoffs
- **Custom C++ Addon vs. Node OS Modules**: Standard Node libraries (like `robotjs` or `node-cmd`) are brittle or deprecated. Building a custom N-API C++ addon was chosen to ensure reliable, high-level control over Windows-specific APIs (e.g., `FindWindow`, `SendInput`).
- **Sequential Tool Execution**: Multiple tool calls from the AI (e.g., open app, then type text) are forcefully batched and awaited sequentially in `useLiveSession.ts`. An explicit `turnComplete: true` is sent only after all tools finish, preventing the AI from interrupting itself or creating infinite execution loops.
- **Polling Canvas vs. Video Stream**: Capturing a JPEG via canvas every 4 seconds was explicitly chosen over a raw video stream to manage bandwidth and prevent the Electron renderer from crashing under heavy load.

## 6. Current Status
- **Fully Working**: Voice streaming, local SQLite memory ingestion via background worker, transparent frameless window rendering, dynamic window resizing (compact widget to expanded memory manager), seamless 9-minute session token swapping, mid-sentence recovery, and native OS automation (launching apps and typing).
- **Partially Built**: Undocumented. All primary files appear to fulfill their intended architectural roles.
- **Broken / Known-Buggy**: No `TODO`, `FIXME`, or `HACK` comments exist in the codebase. Recent bugs regarding tool execution loops and application focus injection have been explicitly patched out.

## 7. Roadmap / Not-Yet-Started
- **Vector DB / ChromaDB Integration**: While "persistent memory" exists via SQLite, any advanced semantic/vector search (e.g., ChromaDB integration for Phase 2) is entirely absent from the codebase and remains NOT IMPLEMENTED.

## 8. Known Constraints
- **OS Lock-in**: The system is strictly bound to Windows. Code references `.exe` binaries and relies on a custom Windows C++ Addon for UI automation and CoreAudio device management.
- **Hardware Profile**: Designed explicitly around the user's MSI Thin 15 (RTX 3050, 16GB RAM). While lightweight due to cloud offloading, screen capture and PCM encoding rely on standard client-side Web APIs.
- **Gemini WebSocket Protocol**: The application architecture is highly constrained by the Google Gemini Bidi WebSocket schema; tool responses must be carefully orchestrated with `clientContent: { turnComplete: true }` frames to yield the floor back to the AI without breaking the session state.
