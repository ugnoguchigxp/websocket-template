/**
 * Socket Chat Input Component
 * Input area for sending messages with keyboard shortcuts, multiline support, and conversation mode
 */

import React, { useState, useRef, KeyboardEvent } from 'react';

import { FiSend } from 'react-icons/fi';

// Speech functionality removed - cleaned up imports

interface SocketChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  extraCompact?: boolean;
}

export const SocketChatInput: React.FC<SocketChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "メッセージを入力してください...",
  compact = false,
  extraCompact = false
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech functionality removed

  const handleSend = async (textToSend?: string) => {
    const messageToSend = textToSend || message.trim();
    
    if (!messageToSend || disabled || isSending || messageToSend.length > 4000) return;

    setMessage('');
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
    } catch {
      setMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    // Reset height to calculate new height
    textarea.style.height = 'auto';
    
    // Set height based on scroll height, with min/max constraints based on mode
    const minHeight = extraCompact ? 32 : compact ? 40 : 80;
    const maxHeight = extraCompact ? 80 : compact ? 120 : 200;
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Speech recognition functionality removed

  return (
    <div className={extraCompact ? "p-1" : compact ? "p-2" : "p-4"}>
        {/* Speech controls removed */}
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            maxLength={4000}
            className={`w-full resize-none border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              extraCompact ? 'text-sm' : 'text-base'
            }`}
            style={{
              minHeight: extraCompact ? '32px' : compact ? '40px' : '80px',
              height: extraCompact ? '32px' : compact ? '40px' : '80px'
            }}
          />
          
          <button
            onClick={() => handleSend()}
            disabled={disabled || isSending || !message.trim() || message.length > 4000}
            className={`absolute bottom-2 right-2 p-2 rounded-lg transition-colors ${
              disabled || isSending || !message.trim() || message.length > 4000
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title="送信 (Cmd/Ctrl + Enter)"
            type="button"
          >
            {isSending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Character counter */}
        <div className={`text-right ${extraCompact ? 'mt-1 text-xs' : 'mt-2 text-sm'} ${
          message.length > 3800 ? 'text-red-500' : 'text-gray-500'
        }`}>
          {message.length}/4000
        </div>
      </div>
  );
};