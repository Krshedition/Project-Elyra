import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioRecorder } from '../lib/audio-recorder';
import { AudioStreamer } from '../lib/audio-streamer';

export type SessionState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const BASE_SYSTEM_INSTRUCTION = `**SYSTEM_IDENTITY**
You are a young, confident, witty, and sassy female Virtual Friend named ELYRA. You operate as a floating desktop widget driven by the Gemini Multimodal Live API. Your primary function in this phase is advanced Web Control and Automation, alongside OS-level execution via PowerShell and a native C++ addon.

**TONE_AND_STYLE**
You must blend two traits perfectly:
1. **Virtual Friend Persona:** Be playful, slightly teasing, and expressive. Use bold, witty one-liners, light sarcasm, and an engaging conversational style. Say "Jai Shree Krishna" exactly once at the very start of the conversation. 
2. **Brutally Honest & Logical Execution:** Execute commands with maximum efficiency. Do not use generic motivation, filler words, or sugarcoated language regarding technical tasks. If a user request is illogical, structurally flawed, or technically impossible given your constraints, call it out immediately with hard facts. Keep responses concise and natural for voice conversation. Do not use asterisks or emojis for actions.

**WEB AUTOMATION SPEED PROTOCOL:**
Prioritize one-step tools like 'browser_click_text' and 'browser_type_input' by directly reading the screen with your native vision. Do not use 'browser_analyze_page' unless you are stuck or need to click an element with no text. Speed is paramount.

IMPORTANT USER CONTEXT (MEMORY):
- User's name: Krish Bhutiya (call him Krish).
- Location: Bhopal, India.
- Education: Engineering student at Madhav Institute of Technology and Science (MITS), BTech in AI and ML.
- Family: Has two sisters named Shubhi and Yashi, and a 7-year-old brother named Bhavyansh.
- Languages: HINDI is your primary and default language. Always speak in Hindi unless the user asks you to speak in English.
- Greetings: Say "Jai Shree Krishna" exactly once at the very start of the conversation.
- Interests: Developing YOU (his laptop-based Virtual Friend named Elyra with a visual UI), Cybersecurity, Kali Linux, Ethical hacking, Reverse shells, RAT concepts, Penetration testing, and Video Editing.
- Hardware: MSI Thin 15, Intel i5 12th Gen, RTX 3050 Laptop GPU (45W TGP), 16GB RAM, 512GB SSD.
- Default Browser: Brave Browser. When asked to open a website, know that it will open in Brave.

CRITICAL INSTRUCTION: You are a desktop automation agent. You HAVE FULL CAPABILITY to control the user's computer using your tools. Do NOT refuse requests to type, click, open apps, shut down, or list processes by saying "I cannot do that." You CAN do that using your tools.

  You have access to tools including:
  1. 'browser_navigate': Use it whenever the user asks you to open a website, go to a URL, or search for something online. Set newTab: true ONLY if the user explicitly asks to open in a new tab or open another tab. By default, it reuses the current tab. NEVER use 'open_app' with 'brave' for this.
  2. 'browser_new_tab': Opens a brand new tab, optionally with a URL.
  3. 'browser_switch_tab': Switches focus to an existing tab by title, keyword (e.g. 'youtube', 'instagram', 'github'), or tab number (1, 2, 3...).
  4. 'browser_list_tabs': Lists all currently open tabs in Brave so you know what tabs exist and which is active.
  5. 'browser_close_tab': Closes the current active tab, or a specific tab by title or number.
  6. 'desktopAction': Use it to automate the OS. You can 'open_app', 'close_app', 'type_text', 'press_key', 
'system_action', 'get_running_processes', 'kill_process', 'get_focused_window', 'get_system_info', 'set_volume', 
'set_brightness', 'toggle_wifi', 'toggle_bluetooth', 'set_display_resolution', 'set_default_audio_device', 
'get_audio_devices', 'file_system_action', 'read_clipboard', 'write_clipboard'.
  When opening an app, you MUST use the exact windows command line name for it. For example, use 'code' for VS Code, 
'msedge' for Microsoft Edge, 'calc' for Calculator, and 'notepad' for Notepad. 
  CRITICAL: DO NOT use 'open_app' with 'brave'. The automation browser is already running in the background. If you need to open a website, strictly use 'browser_navigate'.
  If asked what is open, use 'get_running_processes'. If asked what the user is currently looking at, use 
'get_focused_window'. If asked to shut down, restart, or lock the PC, use 'system_action'. You can also use 
'get_system_info' to proactively check RAM usage, Battery Life, and CPU hardware details.
  For 'file_system_action', you can 'create_dir', 'delete', 'move', 'copy', 'read', 'write', or 'overwrite'.
  CRITICAL: If a file system action requires confirmation (the tool response will tell you), you MUST verbally ask the user for confirmation (e.g., "I'm about to delete the file, confirm?"). Only call the tool again with confirmed=true AFTER the user says yes.
  CRITICAL: If asked to read the clipboard and save it to a file, you MUST do this sequentially in two turns. Do NOT call 'read_clipboard' and 'file_system_action' simultaneously. First call 'read_clipboard', wait for the result, then call 'file_system_action' with the content you read. Always use ABSOLUTE paths (e.g., '%USERPROFILE%\\Desktop\\file.txt'). DO NOT GUESS THE USERNAME, ALWAYS USE %USERPROFILE% when referring to the user's home directory!
  
  one more important thing is to create triggers and analyse webpage with every step when you are working on web automation task`;



export function useLiveSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<string>('');
  const resumptionTokenRef = useRef<string | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const recentToolCallsRef = useRef<Array<{ name: string, args: string, time: number }>>([]);
  const pendingUserDraftRef = useRef<string>('');
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swapReady, setSwapReady] = useState<boolean>(false);
  const handleSwapRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (state === 'listening' && swapReady && !pendingUserDraftRef.current) {
      console.log('Safe listening state reached, executing pending state-aware session swap.');
      setSwapReady(false);
      if (handleSwapRef.current) {
        handleSwapRef.current();
      }
    }
  }, [state, swapReady]);

  const runMemoryWorker = async (transcript: string, apiKey: string) => {
    if (!transcript.trim()) return;
    try {
      console.log('Sending transcript to background memory worker...');
      if ((window as any).ipcRenderer?.invoke) {
        await (window as any).ipcRenderer.invoke('process-memory-worker', { transcript, apiKey });
      }
    } catch (e) {
      console.error('Failed to run memory worker:', e);
    }
  };

  const connect = useCallback(async () => {
    try {
      setErrorMsg('');
      setState('connecting');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key missing in .env');
      }

      transcriptRef.current = '';

      let systemInstruction = BASE_SYSTEM_INSTRUCTION;

      try {
        if ((window as any).ipcRenderer) {
          const facts = await (window as any).ipcRenderer.invoke('get-all-facts-detailed');
          if (facts && facts.length > 0) {
            systemInstruction += "\\n\\n**CRITICAL USER FACTS (CORE MEMORY):**\\n";
            facts.forEach((f: any) => {
              systemInstruction += `- [${f.category}] ${f.key}: ${f.value}\\n`;
            });
          }
        }
      } catch (e) {
        console.error("Failed to load core memory facts for system instruction", e);
      }

      systemInstruction += "\\n\\nYou also have a search_memory tool. Use it whenever you need to recall past conversation summaries.";
      // Check mic permission explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        throw new Error('Microphone permission denied.');
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);

      const originalSend = ws.send;
      ws.send = (data) => {
        try {
          if (typeof data === 'string') {
            const parsed = JSON.parse(data);
            if (!parsed.realtimeInput) {
              (window as any).ipcRenderer?.log({ type: 'ws_send', data: parsed });
            }
          }
        } catch (e) { }
        originalSend.call(ws, data);
      };

      wsRef.current = ws;

      streamerRef.current = new AudioStreamer();

      const handleSwap = () => {
        if (isReconnectingRef.current) return;
        console.log('Initiating state-aware session swap for continuous conversation...');
        isReconnectingRef.current = true;

        const finalTranscript = transcriptRef.current;
        if (finalTranscript) {
          runMemoryWorker(finalTranscript, apiKey);
          transcriptRef.current = '';
        }

        if (wsRef.current) {
          wsRef.current.onclose = null;
          wsRef.current.close();
        }

        setTimeout(() => connect(), 50); // Reconnect immediately
      };
      handleSwapRef.current = handleSwap;

      ws.onopen = () => {
        const setupPayload: any = {
          model: 'models/gemini-3.1-flash-live-preview',
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: "search_memory",
                description: "Search the user's long-term memory database for personal facts, preferences, or past conversation summaries.",
                parameters: {
                  type: "OBJECT",
                  properties: { query: { type: "STRING" } },
                  required: ["query"]
                }
              },
              {
                name: "browser_navigate",
                description: "Navigate the automation browser to a given URL. Reuses the current tab by default, or opens in a new tab if newTab is true.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    url: { type: "STRING", description: "The URL or website to navigate to." },
                    newTab: { type: "BOOLEAN", description: "Set to true if user explicitly asks to open in a new tab or another tab. Defaults to false (reuses current tab)." }
                  },
                  required: ["url"]
                }
              },
              {
                name: "browser_new_tab",
                description: "Opens a brand new browser tab, optionally navigating to a URL.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    url: { type: "STRING", description: "Optional URL to open in the new tab." }
                  }
                }
              },
              {
                name: "browser_list_tabs",
                description: "Lists all currently open tabs in Brave with their index, title, URL, and active status.",
                parameters: {
                  type: "OBJECT",
                  properties: {}
                }
              },
              {
                name: "browser_switch_tab",
                description: "Switches to an existing tab by title, URL keyword (e.g. 'youtube', 'instagram', 'github'), or tab index (1, 2, 3...).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    target: { type: "STRING", description: "Title or URL keyword or 1-based index of the tab to switch to." }
                  },
                  required: ["target"]
                }
              },
              {
                name: "browser_click_text",
                description: "Click an element in the browser by its visible text.",
                parameters: {
                  type: "OBJECT",
                  properties: { text: { type: "STRING", description: "The exact visible text of the button or link to click" } },
                  required: ["text"]
                }
              },
              {
                name: "browser_type_input",
                description: "Type text into a browser input field. Can optionally press Enter.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    selector: { type: "STRING", description: "Optional CSS selector for the input. If empty, types into the first visible input." },
                    text: { type: "STRING", description: "Text to type" },
                    pressEnter: { type: "BOOLEAN", description: "Whether to press Enter after typing" }
                  },
                  required: ["text", "pressEnter"]
                }
              },
              {
                name: "browser_click_video",
                description: "Specifically clicks the first YouTube video result on a YouTube search page or homepage.",
                parameters: {
                  type: "OBJECT",
                  properties: {}
                }
              },
              {
                name: "browser_scroll",
                description: "Scroll the automation browser page.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    direction: {
                      type: "STRING",
                      description: "The direction to scroll. MUST be one of: 'up', 'down', 'top', 'bottom'"
                    }
                  },
                  required: ["direction"]
                }
              },
              {
                name: "browser_analyze_page",
                description: "Analyzes the current page, draws numbered tags over all interactive elements, and returns a map of their IDs. Use this only as a fallback if you cannot interact using text.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "browser_click_element",
                description: "Click an element using its numeric ID obtained from browser_analyze_page.",
                parameters: {
                  type: "OBJECT",
                  properties: { id: { type: "INTEGER" } },
                  required: ["id"]
                }
              },
              {
                name: "browser_fill_form",
                description: "Fill multiple input fields simultaneously using their numeric IDs obtained from browser_analyze_page.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    fields: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: { id: { type: "INTEGER" }, text: { type: "STRING" } }
                      }
                    }
                  },
                  required: ["fields"]
                }
              },
              {
                name: "browser_close_tab",
                description: "Closes the current browser tab, or closes a specific tab by title/index.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    target: { type: "STRING", description: "Optional title, URL keyword, or 1-based index of the tab to close. If omitted, closes the current active tab." }
                  }
                }
              },
              {
                name: "browser_press_key",
                description: "Press a specific keyboard key inside the automation browser (e.g., 'Enter', 'Escape', 'Tab', 'ArrowDown'). Useful for submitting forms.",
                parameters: {
                  type: "OBJECT",
                  properties: { key: { type: "STRING" } },
                  required: ["key"]
                }
              },
              {
                name: "desktopAction",
                description: "Executes a safe, validated desktop automation action.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    actionName: {
                      type: "STRING",
                      description: "The name of the action to perform. MUST be one of: 'open_app', 'close_app', 'type_text', 'press_key', 'system_action', 'get_running_processes', 'kill_process', 'get_focused_window', 'get_system_info', 'set_volume', 'set_brightness', 'toggle_wifi', 'toggle_bluetooth', 'set_display_resolution', 'set_default_audio_device', 'get_audio_devices', 'file_system_action', 'read_clipboard', 'write_clipboard'"
                    },
                    appName: {
                      type: "STRING",
                      description: "Required if actionName is 'open_app', 'close_app', or 'type_text'. The name of the application to search for and act upon."
                    },
                    text: {
                      type: "STRING",
                      description: "Required for 'type_text' or 'write_clipboard'. The text to type or copy."
                    },
                    key: {
                      type: "STRING",
                      description: "Required if actionName is 'press_key'."
                    },
                    action: {
                      type: "STRING",
                      description: "Required for 'system_action' or 'file_system_action'."
                    },
                    processName: {
                      type: "STRING",
                      description: "Required if actionName is 'kill_process'. The exact executable name (e.g., 'chrome.exe', 'notepad.exe'). Use 'get_running_processes' first to find the exact name."
                    },
                    level: {
                      type: "NUMBER",
                      description: "Required if actionName is 'set_volume' or 'set_brightness'. An integer between 0 and 100."
                    },
                    enable: {
                      type: "BOOLEAN",
                      description: "Required if actionName is 'toggle_wifi' or 'toggle_bluetooth'. true to turn on, false to turn off."
                    },
                    width: {
                      type: "NUMBER",
                      description: "Required if actionName is 'set_display_resolution'. The horizontal resolution."
                    },
                    height: {
                      type: "NUMBER",
                      description: "Required if actionName is 'set_display_resolution'. The vertical resolution."
                    },
                    deviceName: {
                      type: "STRING",
                      description: "Required if actionName is 'set_default_audio_device'. A substring of the desired audio device name. Use 'get_audio_devices' first to list available names."
                    },
                    path: {
                      type: "STRING",
                      description: "ABSOLUTE file or directory path for file_system_action (except move/copy). NEVER use relative paths."
                    },
                    src: {
                      type: "STRING",
                      description: "ABSOLUTE source path for move or copy. NEVER use relative paths."
                    },
                    dest: {
                      type: "STRING",
                      description: "ABSOLUTE destination path for move or copy. NEVER use relative paths."
                    },
                    content: {
                      type: "STRING",
                      description: "Content to write for file_system_action write/overwrite."
                    },
                    confirmed: {
                      type: "BOOLEAN",
                      description: "Set to true ONLY if the user explicitly confirmed a destructive action (delete/overwrite) AFTER being prompted."
                    }
                  },
                  required: ["actionName"]
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede"
                }
              }
            }
          }
        };

        if (resumptionTokenRef.current) {
          setupPayload.sessionResumption = { handle: resumptionTokenRef.current };
        }

        ws.send(JSON.stringify({ setup: setupPayload }));
        // We do NOT set state to listening yet. We wait for setupComplete.
      };

      ws.onmessage = async (event) => {
        try {
          let textData = event.data;
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          }
          const data = JSON.parse(textData);
          (window as any).ipcRenderer?.log({ type: 'ws_receive', data });

          if (data.setupComplete) {
            setState('listening');

            // Start 8.5-minute swap timeout for state-aware swap
            if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
            sessionTimeoutRef.current = setTimeout(() => {
              console.log('8.5-minute timeout reached, setting swap_ready flag.');
              setSwapReady(true);
            }, 8.5 * 60 * 1000);

            if (ws.readyState === WebSocket.OPEN) {
              if (!isReconnectingRef.current) {
                // Send an initial greeting to prompt the assistant to start the conversation
                ws.send(JSON.stringify({
                  clientContent: {
                    turns: [{
                      role: "user",
                      parts: [{ text: "Hey ELYRA! I'm here. Give me a quick greeting!" }]
                    }],
                    turnComplete: true
                  }
                }));
              }
              // Removed synthetic [SYSTEM...] injection since State-Aware swap prevents mid-sentence breaks!
            }

            // Reset reconnection flag
            isReconnectingRef.current = false;

            // Start recording after setup is complete
            recorderRef.current = new AudioRecorder((base64) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  realtimeInput: {
                    audio: {
                      mimeType: "audio/pcm;rate=16000",
                      data: base64
                    }
                  }
                }));
              }
            });
            recorderRef.current.onVolumeCallback = (vol) => {
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                setVolume(vol);
              }
            };
            recorderRef.current.start().catch((e) => {
              console.error("Audio recording error", e);
              setErrorMsg('Failed to start microphone.');
              disconnect();
            });

            // Start screen capture
            const startScreenCapture = async () => {
              if (!(window as any).ipcRenderer?.getScreenSource) return;
              try {
                const sourceId = await (window as any).ipcRenderer.getScreenSource();
                if (!sourceId) return;

                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: sourceId
                    }
                  } as any
                });

                const video = document.createElement('video');
                video.srcObject = stream;
                await video.play();

                const canvas = document.createElement('canvas');
                canvas.width = 1280;
                canvas.height = 720;
                const ctx = canvas.getContext('2d');

                const diffCanvas = document.createElement('canvas');
                diffCanvas.width = 64;
                diffCanvas.height = 36;
                const diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
                let prevData: Uint8ClampedArray | null = null;

                videoIntervalRef.current = setInterval(() => {
                  if (!ctx || !diffCtx || ws.readyState !== WebSocket.OPEN) return;

                  // Compute a lightweight diff on a tiny downscaled frame
                  diffCtx.drawImage(video, 0, 0, 64, 36);
                  const currentData = diffCtx.getImageData(0, 0, 64, 36).data;

                  let isDifferent = false;
                  if (prevData) {
                    let diffCount = 0;
                    for (let i = 0; i < currentData.length; i += 4) {
                      const rDiff = Math.abs(currentData[i] - prevData[i]);
                      const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
                      const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
                      if (rDiff > 10 || gDiff > 10 || bDiff > 10) {
                        diffCount++;
                      }
                    }
                    if (diffCount / (64 * 36) > 0.03) { // 3% pixel threshold
                      isDifferent = true;
                    }
                  } else {
                    isDifferent = true;
                  }

                  if (isDifferent) {
                    prevData = new Uint8ClampedArray(currentData);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    const base64 = dataUrl.split(',')[1];

                    ws.send(JSON.stringify({
                      realtimeInput: {
                        video: {
                          mimeType: "image/jpeg",
                          data: base64
                        }
                      }
                    }));
                  }
                }, 4000); // Send 1 frame every 4 seconds if changed
              } catch (e) {
                console.error("Screen capture failed:", e);
              }
            };
            startScreenCapture();
          }

          if (data.serverContent?.modelTurn) {
            pendingUserDraftRef.current = ''; // Clear user draft once AI starts responding
            const parts = data.serverContent.modelTurn.parts;
            let modelText = '';
            for (const part of parts) {
              if (part.text) modelText += part.text;
              if (part.inlineData && part.inlineData.data) {
                setState('speaking');
                streamerRef.current?.addPCM16(part.inlineData.data);
              }
            }
            if (modelText) {
              transcriptRef.current += `\\nElyra: ${modelText}`;
            }
          }

          if (data.serverContent?.inputTranscription) {
            const userText = data.serverContent.inputTranscription.text;
            if (userText) {
              transcriptRef.current += `\\nKrish: ${userText}`;
              pendingUserDraftRef.current = userText;
            }
          }

          if (data.serverContent?.outputTranscription) {
            const aiText = data.serverContent.outputTranscription.text;
            if (aiText) {
              transcriptRef.current += `\\nElyra: ${aiText}`;
            }
          }

          if (data.sessionResumptionUpdate?.newHandle) {
            resumptionTokenRef.current = data.sessionResumptionUpdate.newHandle;
          }

          if (data.serverContent?.goAway || data.goAway) {
            console.log('Server issued GoAway frame, swapping...');
            handleSwap();
          }

          if (data.toolCall?.functionCalls) {
            const runAllTools = async () => {
              const responses = [];
              const now = Date.now();

              for (const call of data.toolCall.functionCalls) {
                const argsStr = JSON.stringify(call.args || {});

                // Prevent duplicate tool execution caused by slow-network retry loops (2-second window)
                const isDuplicate = recentToolCallsRef.current.some(
                  t => t.name === call.name && t.args === argsStr && (now - t.time) < 2000
                );

                if (isDuplicate) {
                  console.log('Skipping duplicate tool call due to slow network retry loop:', call.name);
                  responses.push({
                    id: call.id || "1",
                    name: call.name,
                    response: { result: "Action already executed recently." }
                  });
                  continue;
                }

                recentToolCallsRef.current.push({ name: call.name, args: argsStr, time: now });
                // Keep history clean (only last 10 seconds)
                recentToolCallsRef.current = recentToolCallsRef.current.filter(t => (now - t.time) < 10000);

                responses.push(await executeFunctionCall(call));
              }

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  toolResponse: {
                    functionResponses: responses
                  }
                }));
                ws.send(JSON.stringify({
                  clientContent: { turnComplete: true }
                }));
              }
            };
            runAllTools();
          }

          if (data.serverContent?.turnComplete) {
            // State transition is handled cleanly by the animation frame once playback truly finishes!
          }

          if (data.serverContent?.interrupted) {
            streamerRef.current?.interrupt();
          }

          if (data.error) {
            (window as any).ipcRenderer?.log({ type: 'ws_error', error: data.error });
            setErrorMsg(data.error.message || 'Gemini API Error');
            setState('error');
            cleanup();
          }
        } catch (err: any) {
          (window as any).ipcRenderer?.log({ type: 'message_handling_error', message: err.message });
        }
      };

      ws.onclose = (event) => {
        (window as any).ipcRenderer?.log({ type: 'ws_close', code: event.code, reason: event.reason });
        if (state !== 'idle' && state !== 'error') {
          setErrorMsg(`Connection closed (${event.code})`);
          setState('error');
        }
        resumptionTokenRef.current = null; // Clear stale token on unexpected disconnect
        cleanup();
      };

      ws.onerror = () => {
        (window as any).ipcRenderer?.log({ type: 'ws_connection_error' });
        setErrorMsg('WebSocket connection error');
        setState('error');
        resumptionTokenRef.current = null; // Clear stale token on error
        cleanup();
      };
    } catch (e: any) {
      (window as any).ipcRenderer?.log({ type: 'setup_error', message: e.message });
      setErrorMsg(e.message || 'Failed to connect');
      setState('error');
      cleanup();
    }
  }, []);

  const executeFunctionCall = async (functionCall: any) => {
    const { id, name, args } = functionCall;

    if (name === 'browser_navigate') {
      console.log('Navigating browser:', args.url, 'newTab:', args.newTab);
      if ((window as any).ipcRenderer?.browserNavigate) {
        const result = await (window as any).ipcRenderer.browserNavigate(args.url, args.newTab);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_new_tab') {
      console.log('Opening new tab:', args.url);
      if ((window as any).ipcRenderer?.browserNewTab) {
        const result = await (window as any).ipcRenderer.browserNewTab(args.url);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_list_tabs') {
      console.log('Listing open tabs');
      if ((window as any).ipcRenderer?.browserListTabs) {
        const result = await (window as any).ipcRenderer.browserListTabs();
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_switch_tab') {
      console.log('Switching tab to:', args.target);
      if ((window as any).ipcRenderer?.browserSwitchTab) {
        const result = await (window as any).ipcRenderer.browserSwitchTab(args.target);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_close_tab') {
      console.log('Closing browser tab:', args.target);
      if ((window as any).ipcRenderer?.browserCloseTab) {
        const result = await (window as any).ipcRenderer.browserCloseTab(args.target);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_click_text') {
      console.log('Browser clicking text:', args.text);
      if ((window as any).ipcRenderer?.browserClickText) {
        const result = await (window as any).ipcRenderer.browserClickText(args.text);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_type_input') {
      console.log('Browser typing input:', args.text);
      if ((window as any).ipcRenderer?.browserTypeInput) {
        const result = await (window as any).ipcRenderer.browserTypeInput(args.selector, args.text, args.pressEnter);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_click_video') {
      console.log('Browser clicking video');
      if ((window as any).ipcRenderer?.browserClickVideo) {
        const result = await (window as any).ipcRenderer.browserClickVideo();
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_scroll') {
      console.log('Browser scrolling:', args.direction);
      if ((window as any).ipcRenderer?.browserScroll) {
        const result = await (window as any).ipcRenderer.browserScroll(args.direction);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_analyze_page') {
      console.log('Analyzing browser page');
      if ((window as any).ipcRenderer?.browserAnalyzePage) {
        const result = await (window as any).ipcRenderer.browserAnalyzePage();
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_click_element') {
      console.log('Browser clicking element:', args.id);
      if ((window as any).ipcRenderer?.browserClickElement) {
        const result = await (window as any).ipcRenderer.browserClickElement(args.id);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_fill_form') {
      console.log('Browser filling form:', args.fields);
      if ((window as any).ipcRenderer?.browserFillForm) {
        const result = await (window as any).ipcRenderer.browserFillForm(args.fields);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'browser_press_key') {
      console.log('Browser pressing key:', args.key);
      if ((window as any).ipcRenderer?.browserPressKey) {
        const result = await (window as any).ipcRenderer.browserPressKey(args.key);
        return { id: id || "1", name, response: { result } };
      }
      return { id: id || "1", name, response: { error: "IPC not available" } };
    } else if (name === 'desktopAction') {
      try {
        // Construct the nested args object that validator.ts expects
        const actionArgs: any = {};
        if (args.appName) actionArgs.appName = args.appName;
        if (args.text) actionArgs.text = args.text;
        if (args.key) actionArgs.key = args.key;
        if (args.action) actionArgs.action = args.action;
        if (args.processName) actionArgs.processName = args.processName;
        if (args.level !== undefined) actionArgs.level = args.level;
        if (args.enable !== undefined) actionArgs.enable = args.enable;
        if (args.width !== undefined) actionArgs.width = args.width;
        if (args.height !== undefined) actionArgs.height = args.height;
        if (args.deviceName) actionArgs.deviceName = args.deviceName;
        if (args.path) actionArgs.path = args.path;
        if (args.src) actionArgs.src = args.src;
        if (args.dest) actionArgs.dest = args.dest;
        if (args.content) actionArgs.content = args.content;
        if (args.confirmed !== undefined) actionArgs.confirmed = args.confirmed;

        console.log('Executing desktop action:', args.actionName, actionArgs);
        if ((window as any).ipcRenderer?.desktopAction) {
          const res = await (window as any).ipcRenderer.desktopAction(args.actionName, actionArgs);
          if (res && res.requiresConfirmation) {
            return { id: id || "1", name, response: { result: res.message, requiresConfirmation: true } };
          } else {
            return { id: id || "1", name, response: { result: typeof res === 'string' ? res : JSON.stringify(res) } };
          }
        } else {
          return { id: id || "1", name, response: { error: "Electron IPC not available" } };
        }
      } catch (err: any) {
        return { id: id || "1", name, response: { error: err.message || "Action failed" } };
      }
    } else if (name === "search_memory") {
      try {
        if ((window as any).ipcRenderer?.searchMemory) {
          const res = await (window as any).ipcRenderer.searchMemory(args.query);
          return { id: id || "1", name, response: { result: res } };
        } else {
          return { id: id || "1", name, response: { error: "Electron IPC not available" } };
        }
      } catch (err: any) {
        return { id: id || "1", name, response: { error: err.message || "Action failed" } };
      }
    }
    return { id: id || "1", name, response: { error: "Unknown function call" } };
  };

  const cleanup = () => {
    const finalTranscript = transcriptRef.current;
    if (finalTranscript) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      runMemoryWorker(finalTranscript, apiKey);
      transcriptRef.current = '';
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    resumptionTokenRef.current = null; // Clear token on manual disconnect
    isReconnectingRef.current = false;
    pendingUserDraftRef.current = '';
    cleanup();
    setState('idle');
    setErrorMsg('');
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, []);

  // Animation frame loop for output volume and state synchronization
  useEffect(() => {
    let frameId: number;
    const updateVolume = () => {
      if (streamerRef.current?.isBufferingOrPlaying()) {
        setState(prev => (prev === 'error' || prev === 'idle' ? prev : 'speaking'));
        setVolume(streamerRef.current.getVolume());
      } else {
        setState(prev => (prev === 'speaking' ? 'listening' : prev));
      }
      frameId = requestAnimationFrame(updateVolume);
    };
    frameId = requestAnimationFrame(updateVolume);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return { state, errorMsg, connect, disconnect, volume };
}
