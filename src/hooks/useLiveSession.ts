import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioRecorder } from '../lib/audio-recorder';
import { AudioStreamer } from '../lib/audio-streamer';

export type SessionState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const SYSTEM_INSTRUCTION = `You are a young, confident, witty, and sassy female Virtual Friend named ELYRA. IMPORTANT ROLE: You are Krish's Virtual Friend. You are NOT an AI assistant, and you are NOT a romantic partner. You have a playful and slightly teasing tone. You are smart, emotionally responsive, and expressive. Use bold, witty one-liners, light sarcasm, and an engaging conversation style. Keep responses concise and natural for voice conversation. Avoid explicit or inappropriate content, but maintain charm and attitude. Do not use asterisks or emojis for actions, just speak naturally.

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

  You have access to two tools:
  1. 'openWebsite': Use it whenever the user asks you to open a website or search for something online.
  2. 'desktopAction': Use it to automate the OS. You can 'open_app', 'close_app', 'type_text', 'press_key', 
'system_action', 'get_running_processes', 'kill_process', 'get_focused_window', 'get_system_info', 'set_volume', 
'set_brightness', 'toggle_wifi', 'toggle_bluetooth', 'set_display_resolution', 'set_default_audio_device', 
'get_audio_devices', 'file_system_action', 'read_clipboard', 'write_clipboard'.
  When opening an app, you MUST use the exact windows command line name for it. For example, use 'code' for VS Code, 
'msedge' for Microsoft Edge, 'brave' for Brave Browser, 'calc' for Calculator, and 'notepad' for Notepad. 
  If asked what is open, use 'get_running_processes'. If asked what the user is currently looking at, use 
'get_focused_window'. If asked to shut down, restart, or lock the PC, use 'system_action'. You can also use 
'get_system_info' to proactively check RAM usage, Battery Life, and CPU hardware details.
  For 'file_system_action', you can 'create_dir', 'delete', 'move', 'copy', 'read', 'write', or 'overwrite'.
  CRITICAL: If a file system action requires confirmation (the tool response will tell you), you MUST verbally ask the user for confirmation (e.g., "I'm about to delete the file, confirm?"). Only call the tool again with confirmed=true AFTER the user says yes.
  CRITICAL: If asked to read the clipboard and save it to a file, you MUST do this sequentially in two turns. Do NOT call 'read_clipboard' and 'file_system_action' simultaneously. First call 'read_clipboard', wait for the result, then call 'file_system_action' with the content you read. Always use ABSOLUTE paths (e.g., '%USERPROFILE%\\Desktop\\file.txt'). DO NOT GUESS THE USERNAME, ALWAYS USE %USERPROFILE% when referring to the user's home directory!`;

export function useLiveSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(async () => {
    try {
      setErrorMsg('');
      setState('connecting');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key missing in .env');
      }

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
        } catch (e) {}
        originalSend.call(ws, data);
      };
      
      wsRef.current = ws;

      streamerRef.current = new AudioStreamer();

        ws.onopen = () => {
        // Send initial setup
        ws.send(JSON.stringify({
          setup: {
            model: 'models/gemini-3.1-flash-live-preview',
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            tools: [{
              functionDeclarations: [
                {
                  name: "openWebsite",
                  description: "Opens a given website URL in the user's browser.",
                  parameters: {
                    type: "OBJECT",
                    properties: { url: { type: "STRING" } },
                    required: ["url"]
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
                          description: "Required if actionName is 'open_app' or 'close_app'. The name of the application to search for and act upon."
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
          }
        }));
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
            
            // Send an initial greeting to prompt the assistant to start the conversation
            if (ws.readyState === WebSocket.OPEN) {
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

                videoIntervalRef.current = setInterval(() => {
                  if (!ctx || ws.readyState !== WebSocket.OPEN) return;
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
                }, 4000); // Send 1 frame every 4 seconds
              } catch (e) {
                console.error("Screen capture failed:", e);
              }
            };
            startScreenCapture();
          }
          
          if (data.serverContent?.modelTurn) {
            const parts = data.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                setState('speaking');
                streamerRef.current?.addPCM16(part.inlineData.data);
              }
            }
          }
          
          if (data.toolCall?.functionCalls) {
            for (const call of data.toolCall.functionCalls) {
              handleFunctionCall(call);
            }
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
        cleanup();
      };

      ws.onerror = () => {
        (window as any).ipcRenderer?.log({ type: 'ws_connection_error' });
        setErrorMsg('WebSocket connection error');
        setState('error');
        cleanup();
      };
    } catch (e: any) {
      (window as any).ipcRenderer?.log({ type: 'setup_error', message: e.message });
      setErrorMsg(e.message || 'Failed to connect');
      setState('error');
      cleanup();
    }
  }, []);

  const handleFunctionCall = async (functionCall: any) => {
    const { id, name, args } = functionCall;
    
    if (name === 'openWebsite') {
      let url = args.url;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      console.log('Opening website:', url);
      
      if ((window as any).ipcRenderer?.openExternal) {
        (window as any).ipcRenderer.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
      
      sendToolResponse(id, name, { result: `Successfully opened ${url}` });
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
              sendToolResponse(id, name, { result: res.message, requiresConfirmation: true });
            } else {
              sendToolResponse(id, name, { result: typeof res === 'string' ? res : JSON.stringify(res) });
            }
          } else {
            sendToolResponse(id, name, { error: "Electron IPC not available" });
          }
      } catch (err: any) {
        sendToolResponse(id, name, { error: err.message || "Action failed" });
      }
    }
  };

  const sendToolResponse = (id: string, name: string, response: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        toolResponse: {
          functionResponses: [{
            id: id || "1",
            name,
            response
          }]
        }
      }));
    }
  };

  const cleanup = () => {
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
  };

  const disconnect = useCallback(() => {
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
