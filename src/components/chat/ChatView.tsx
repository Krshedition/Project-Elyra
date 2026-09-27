import React, { useRef, useEffect } from 'react';
import { ElyraOrb } from '../elyra/ElyraOrb';
import { VoiceWaveform } from '../elyra/VoiceWaveform';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { ChatMessage, ElyraState } from '../../types/chat';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onOpenEmail: () => void;
  elyraState: ElyraState;
  volume: number;
  onToggleVoice: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  onOpenEmail,
  elyraState,
  volume,
  onToggleVoice,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isInitialState = messages.length <= 1;

  const samplePrompts = [
    'Send an email to Rahul telling him that the project presentation is ready.',
    'What is on my schedule today?',
    'What is the weather in Bhopal right now?',
  ];

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#0B0E17]">
      {/* Main Chat Stream Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
          {isInitialState ? (
            /* App Launch Empty Hero State (Matches Screen 1) */
            <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto select-none">
              <div className="mb-6">
                <ElyraOrb size="xl" state={elyraState} volume={volume} />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Hi, I'm Elyra.
              </h1>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                Your AI assistant. I can help you with emails, web research, and desktop actions.
                How can I help you today?
              </p>

              {/* Quick Prompt Chips */}
              <div className="flex flex-col gap-2.5 w-full">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[#131726]/80 hover:bg-purple-950/30 border border-purple-500/15 hover:border-purple-500/40 text-xs text-slate-300 hover:text-purple-200 transition-all duration-200 shadow-sm"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="max-w-3xl mx-auto flex flex-col gap-2 pb-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onOpenEmail={onOpenEmail}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <ChatInput
          onSendMessage={onSendMessage}
          isListening={elyraState === 'listening'}
          onToggleVoice={onToggleVoice}
          volume={volume}
        />
      </div>

      {/* Right Assistant Widget Panel (Matches Screen 8) */}
      <aside className="hidden xl:flex w-72 h-full border-l border-purple-500/10 bg-[#0E121E]/60 flex-col items-center justify-between p-6 select-none">
        <div className="w-full flex flex-col items-center pt-8">
          <ElyraOrb size="lg" state={elyraState} volume={volume} className="mb-5" />

          <h3 className="font-semibold text-base text-white">Elyra</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Online</span>
          </div>

          <div className="my-6">
            <VoiceWaveform
              volume={volume}
              active={elyraState === 'speaking' || elyraState === 'listening'}
            />
          </div>

          <p className="text-xs text-purple-300/80 italic text-center">
            {elyraState === 'speaking'
              ? 'Speaking to you...'
              : elyraState === 'listening'
              ? 'Listening carefully...'
              : elyraState === 'working'
              ? 'Working on task...'
              : "I'm here to help!"}
          </p>
        </div>

        <div className="w-full rounded-xl bg-purple-950/20 border border-purple-500/15 p-3 text-[11px] text-slate-400 text-center">
          Multimodal Live voice & desktop integration active
        </div>
      </aside>
    </div>
  );
};
