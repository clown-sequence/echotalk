import React, { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
  sending?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  sending = false,
}) => {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim() || disabled || sending) return;

    const success = await onSend(message);
    if (success) {
      setMessage(''); // Clear input after successful send
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t-2 border-black dark:border-white bg-white dark:bg-black transition-colors duration-300">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled || sending}
          className={`
            flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white 
            placeholder-black placeholder-opacity-50 dark:placeholder-white dark:placeholder-opacity-50 
            border-2 border-black dark:border-white rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white 
            transition-all duration-300
            ${(disabled || sending) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className={`
            px-4 py-2 bg-black dark:bg-white text-white dark:text-black 
            border-2 border-black dark:border-white rounded-lg font-medium 
            transition-all duration-300 flex items-center gap-2
            ${
              !message.trim() || disabled || sending
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:opacity-80 hover:scale-105'
            }
          `}
        >
          {sending ? (
            <>
              <span className="animate-spin">⏳</span>
              <span className="hidden sm:inline">Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};