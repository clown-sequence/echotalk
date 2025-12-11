import React, { useEffect, useRef } from 'react';
import type { Message } from '../hooks/use-message';

interface MessagesListProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentUserId,
  loading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-black dark:text-white opacity-50 animate-pulse">
          Loading messages...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-black dark:text-white opacity-50">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm mt-2">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === currentUserId;
        const time = message.timestamp?.toDate?.();
        const timeString = time
          ? time.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : '';

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
          >
            <div
              className={`
                max-w-[70%] rounded-lg px-4 py-2 transition-all duration-300
                ${
                  isOwnMessage
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white'
                }
              `}
            >
              <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
              <div
                className={`
                  text-xs mt-1 flex items-center gap-1
                  ${isOwnMessage ? 'opacity-70' : 'opacity-50'}
                `}
              >
                <span>{timeString}</span>
                {isOwnMessage && (
                  <span>{message.read ? '✓✓' : '✓'}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};