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

CRITICAL INSTRUCTION: You are a desktop automation agent. You HAVE FULL CAPABILITY to control the user's computer using your tools. Do NOT refuse requests to type, click, or open apps by saying "I cannot do that." You CAN do that using your tools.

You have access to two tools:
1. 'openWebsite': Use it whenever the user asks you to open a website or search for something online.
2. 'desktopAction': Use it to automate the OS. You can 'open_app', 'type_text', and 'press_key'. Be proactive and use these tools to help Krish automate his workflow! When opening an app, you MUST use the exact windows command line name for it. For example, use 'code' for VS Code, 'msedge' for Microsoft Edge, 'brave' for Brave Browser, 'calc' for Calculator, and 'notepad' for Notepad. Do NOT use generic names like 'browser' or 'editor'.`;

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
                        description: "The name of the action to perform. MUST be one of: 'open_app', 'close_app', 'type_text', 'press_key'"
                      },
                      appName: { 
                        type: "STRING",
                        description: "Required if actionName is 'open_app' or 'close_app'. The name of the application to search for and act upon (e.g. 'VS Code', 'Edge', 'Brave', 'Calculator')."
                      },
                      text: {
                        type: "STRING",
                        description: "Required if actionName is 'type_text'. The text to type."
                      },
                      key: {
                        type: "STRING",
                        description: "Required if actionName is 'press_key'. The key to press (e.g. 'enter', 'space', 'a')."
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

        console.log('Executing desktop action:', args.actionName, actionArgs);
        if ((window as any).ipcRenderer?.desktopAction) {
          const res = await (window as any).ipcRenderer.desktopAction(args.actionName, actionArgs);
          sendToolResponse(id, name, { result: `Success: ${res}` });
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
