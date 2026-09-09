## 1. Project Overview
Project Elyra is a highly customized, Windows-specific virtual AI assistant designed for a specific user (Krish Bhutiya). Operating as a floating, frameless desktop widget, it utilizes the Gemini Multimodal Live API to provide ultra-low latency conversational AI with real-time vision capabilities. Currently, for its Phase 1 college presentation, Elyra is strictly focused on serving as an advanced **Web Controller and Automation System**. Its core value proposition is intelligent browser orchestration—using a persistent Playwright sandbox and dynamic DOM-tagging to allow the AI to physically "see" and autonomously navigate web pages, click elements, and fill forms without manual user input. While the foundation for native OS automation (launching apps, injecting keystrokes) exists via custom C++ node addons, this is considered the next evolution of the project. Elyra also features a persistent, long-term memory system backed by a local SQLite database to organically learn user facts and session summaries over time.

## 2. Tech Stack
- **Electron (v42.2.0)**: Desktop application shell, handling deep system integration, IPC bridging, and the transparent, frameless, click-through UI overlay.
- **React (v19) + Vite**: Frontend rendering layer and blazing-fast development server.
- **TailwindCSS + Framer Motion**: Core UI styling, responsive design, and smooth micro-animations for the widget and memory manager states.
- **@google/genai (v2.6.0)**: Official Google SDK, leveraging `gemini-3.1-flash-live-preview` via WebSockets for real-time Bidi (bidirectional) audio/video streaming.
- **Playwright**: Core browser orchestration engine used to launch an isolated testing sandbox (Brave/Chromium), inject visual numeric tags (`[ID]`) into the DOM, and execute web-based AI commands.
- **node-addon-api (N-API)**: Used to compile `elyra_automation.node`, a custom C++ native binary for native Windows APIs.
- **better-sqlite3**: Synchronous, high-performance local SQLite database engine used to store long-term context without cloud overhead.

## 3. Architecture
### System Diagram
```text
[ Windows OS ] <--> [ C++ Native Addon ] & [ Playwright Browser Service ]
                           ^
                           | (IPC / Context Bridge)
[ Electron Main Process ] (IPC Hub, SQLite Memory DB, Window Manager)
                           ^
                           | (WebSocket / WebRTC)
[ Electron Renderer (React) ] <--> [ WaveWidget UI & Memory Manager ]
                           ^
                           | (WebSocket Streaming)
[ Gemini Live API (Google Cloud) ]
```

### End-to-End Voice Flow
1. **Input**: `AudioRecorder` captures raw microphone data.
2. **Streaming**: Base64 encoded PCM16 (16kHz) chunks are streamed continuously via the WebSocket `realtimeInput` payload.
3. **Processing**: Google's server performs Voice Activity Detection (VAD) and STT internally, triggering a `modelTurn`.
4. **Response**: The server streams back Base64 PCM16 (24kHz) audio data.
5. **Output**: The React client receives `inlineData.data`, decodes it, and feeds it into the `AudioStreamer` for playback.

### Vision-Based Screen Capture
WebRTC is utilized via `desktopCapturer.getSources()`. `navigator.mediaDevices.getUserMedia` captures the desktop feed into a hidden HTML `<video>` element. 
Instead of streaming heavy continuous video, the system uses an optimized event-driven diffing mechanism: a `<canvas>` draws the video frame every 4 seconds, downscales it, and computes a pixel diff against the previous frame. If less than 3% of the screen has changed, it drops the frame entirely. If there is a change, it sends the full compressed JPEG as a `realtimeInput` image chunk. This dramatically reduces idle bandwidth.

### Web Automation Engine (Playwright)
Elyra utilizes a headless-capable browser sandbox driven by Playwright. When instructed to research or open a webpage, Elyra autonomously runs a DOM-tagging script (`browser_analyze_page`). This script scans the DOM for interactive elements and securely injects visual red boxes with numeric IDs over them. Elyra's vision system captures these tags, allowing her to issue pinpoint commands (e.g., `browser_click_element(12)`) to seamlessly orchestrate complex web workflows without relying on brittle CSS selectors.

## 4. Module/File Map
- `electron/main.ts`: Main process entry; initializes transparent windows, handles IPC routing, and bootstraps memory. (Complete)
- `electron/browser_service.ts`: Playwright orchestrator; manages browser contexts, tabs, and DOM-tagging injection for web automation. (Complete)
- `electron/memory.ts`: SQLite wrapper managing `user_facts` and `sessions` tables. (Complete)
- `electron/action_handler.ts`: Native wrapper executing robust PowerShell scripts and OS commands via the C++ `elyra_automation.node` binary. (Complete)
- `electron/validator.ts`: Security layer that sanitizes all AI-generated OS action requests. (Complete)
- `electron/preload.ts`: Electron ContextBridge exposing safe IPC methods to the React renderer. (Complete)
- `src/App.tsx`: Root React component orchestrating dynamic window sizing and layout. (Complete)
- `src/hooks/useLiveSession.ts`: Monolithic hook managing the Gemini WebSocket lifecycle, WebRTC screen capture, audio streaming, and browser/desktop tool response execution. (Complete)
- `src/WaveWidget.tsx`: The primary visual interface featuring a floating, animated orb/waveform. (Complete)
- `src/components/MemoryManager.tsx`: User-facing UI modal for viewing and editing long-term facts. (Complete)
- `build/Release/elyra_automation.node`: Compiled C++ Native Addon executing low-level Windows commands. (Complete)

## 5. Key Design Decisions & Tradeoffs
- **Playwright over Native Clicks for Web**: Interacting with dynamic web pages using physical OS mouse clicks is highly error-prone. Building a dedicated Playwright orchestrator allows Elyra to perfectly map elements via JS injection and DOM tagging, making web execution 100% reliable.
- **Copy-Paste over Raw Typing**: To avoid keystroke collisions during rapid OS/web interactions, Elyra is explicitly instructed to write text to the system clipboard and simulate `Ctrl+V` rather than typing character-by-character.
- **Sequential Tool Execution**: Multiple tool calls from the AI are forcefully batched and awaited sequentially in `useLiveSession.ts` to prevent infinite execution loops and race conditions.

## 6. Current Status
- **Fully Working (Phase 1: Web Automation Focus)**: Real-time Voice/Vision streaming, dynamic DOM-tagging web automation via Playwright sandbox, robust PowerShell integrations, local SQLite memory ingestion, mid-sentence recovery, and transparent UI rendering.
- **Partially Built**: Basic OS automation primitives (launching specific apps, simulated typing, window focusing) exist, but advanced native OS integration is scheduled for Phase 2.

## 7. Roadmap / Next Steps
- **Phase 2: Deep OS Automation**: Transitioning focus from the browser orchestrator to deep Windows OS integration (managing local files, native settings control, and complex desktop workflows).
- **Advanced Background Tasks**: Enabling the system to send emails (SMTP/OAuth) and schedule calendar meetings silently via headless APIs.
- **Vector DB / ChromaDB Integration**: Upgrading the local SQLite memory system to include advanced semantic/vector search for deeper contextual recall.

## 8. Known Constraints
- **Gemini WebSocket Protocol**: The application architecture is highly constrained by the Google Gemini Bidi WebSocket schema; tool responses must be carefully orchestrated with `clientContent: { turnComplete: true }` frames.
- **Hardware Profile**: Designed explicitly around the user's MSI Thin 15 (RTX 3050, 16GB RAM). While lightweight due to cloud offloading, screen capture relies on standard client-side Web APIs.
