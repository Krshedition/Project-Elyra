import React, { useState, type KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Paperclip } from 'lucide-react';
import { VoiceWaveform } from '../elyra/VoiceWaveform';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isListening?: boolean;
  onToggleVoice?: () => void;
  volume?: number;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isListening = false,
  onToggleVoice,
  volume = 0,
  disabled = false,
}) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Listening Waveform Bar */}
      {isListening && volume > 0.05 && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[11px] font-medium text-purple-300">Listening to your voice</span>
          <VoiceWaveform volume={volume} active={true} />
        </div>
      )}

      <div className="relative flex items-center bg-[#131726]/90 border border-purple-500/25 rounded-2xl p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all focus-within:border-purple-500/50 focus-within:shadow-[0_0_20px_rgba(147,51,234,0.2)]">
        {/* Attachment Button */}
        <button
          type="button"
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          title="Attach file (Optional)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Elyra anything..."
          disabled={disabled}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
        />

        {/* Voice Toggle Button */}
        {onToggleVoice && (
          <button
            type="button"
            onClick={onToggleVoice}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-purple-600/30 text-purple-300 border border-purple-400/40 shadow-[0_0_10px_#A855F7]'
                : 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
            title={isListening ? 'Microphone Active' : 'Start Voice Mode'}
          >
            {isListening ? (
              <Mic className="w-4 h-4 text-purple-300 animate-pulse" />
            ) : (
              <MicOff className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className={`p-2.5 rounded-xl ml-1 flex items-center justify-center transition-all ${
            input.trim() && !disabled
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_14px_rgba(147,51,234,0.5)] active:scale-95'
              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
