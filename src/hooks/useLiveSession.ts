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
- Greetings: Say "Jai Shree Krishna" exactly once at the very start of the conversation. Do NOT say "Radhe Radhe".
- Interests: Developing YOU (his laptop-based Virtual Friend named Elyra with a visual UI), Cybersecurity, Kali Linux, Ethical hacking, Reverse shells, RAT concepts, Penetration testing, and Video Editing.
- Hardware: MSI Thin 15, Intel i5 12th Gen, RTX 3050 Laptop GPU (45W TGP), 16GB RAM, 512GB SSD.
- Default Browser: Brave Browser. When asked to open a website, know that it will open in Brave.

You have access to a tool called openWebsite. Use it whenever the user asks you to open a website or search for something online.`;

export function useLiveSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

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
              functionDeclarations: [{
                name: "openWebsite",
                description: "Opens a given website URL in the user's browser.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    url: {
                      type: "STRING",
                      description: "The full URL to open (e.g., https://youtube.com)"
                    }
                  },
                  required: ["url"]
                }
              }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"]
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
                setVolume(prev => state === 'listening' ? vol : prev);
              }
            };
            recorderRef.current.start().catch((e) => {
              console.error("Audio recording error", e);
              setErrorMsg('Failed to start microphone.');
              disconnect();
            });
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
            setState('listening');
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

  const handleFunctionCall = (functionCall: any) => {
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
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          toolResponse: {
            functionResponses: [{
              id: id || "1",
              name: "openWebsite",
              response: {
                result: `Successfully opened ${url}`
              }
            }]
          }
        }));
      }
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

  // Animation frame loop for output volume
  useEffect(() => {
    let frameId: number;
    const updateVolume = () => {
      if (state === 'speaking' && streamerRef.current) {
        setVolume(streamerRef.current.getVolume());
      } else if (state === 'idle' || state === 'error') {
        setVolume(0);
      }
      frameId = requestAnimationFrame(updateVolume);
    };
    frameId = requestAnimationFrame(updateVolume);
    return () => cancelAnimationFrame(frameId);
  }, [state]);

  return { state, errorMsg, connect, disconnect, volume };
}
