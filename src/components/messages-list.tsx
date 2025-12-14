// ============================================
// components/MessagesList.tsx
// Type-safe messages list with proper timestamp handling
// ============================================

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, User } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
export interface MessageDocument {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  read?: boolean;
  type?: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
}

interface FirestoreRawTimestamp {
  _seconds: number;
  _nanoseconds?: number;
}

type TimestampValue = Timestamp | Date | string | number | FirestoreRawTimestamp | null | undefined;
interface MessageTimeResult {
  date: Date | null;
  isValid: boolean;
}
interface MessagesListProps {
  messages: MessageDocument[];
  currentUserId: string;
  loading?: boolean;
}

const isFirestoreTimestamp = (value: unknown): value is Timestamp => {
  return (
    value instanceof Timestamp ||
    (typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as Record<string, unknown>).toDate === 'function')
  );
};
const isRawFirestoreTimestamp = (value: unknown): value is FirestoreRawTimestamp => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_seconds' in value &&
    typeof (value as FirestoreRawTimestamp)._seconds === 'number'
  );
};
const getDateFromTimestamp = (timestamp: TimestampValue): MessageTimeResult => {
  try {
    if (timestamp == null) {
      return { date: null, isValid: false };
    }
    if (isFirestoreTimestamp(timestamp)) {
      const date = timestamp.toDate();
      return { date, isValid: date instanceof Date && !isNaN(date.getTime()) };
    }
    if (timestamp instanceof Date) {
      return { date: timestamp, isValid: !isNaN(timestamp.getTime()) };
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return { date, isValid: !isNaN(date.getTime()) };
    }

    if (isRawFirestoreTimestamp(timestamp)) {
      const date = new Date(timestamp._seconds * 1000);
      return { date, isValid: !isNaN(date.getTime()) };
    }

    return { date: null, isValid: false };
  } catch (error) {
    console.warn('Error parsing timestamp:', error, timestamp);
    return { date: null, isValid: false };
  }
};
const formatMessageTime = (timestamp: TimestampValue): string => {
  const { date, isValid } = getDateFromTimestamp(timestamp);

  if (!isValid || !date) {
    return '';
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    if (diffSeconds < 10) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    if (diffYears === 1) return '1 year ago';
    return `${diffYears} years ago`;
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '';
  }
};
const getMessageText = (message: MessageDocument): string => {
  if (typeof message.text === 'string') {
    return message.text;
  }

  if (message.text == null) {
    return '';
  }

  try {
    return String(message.text);
  } catch (error) {
    console.warn('Error converting message text to string:', error);
    return '[Message could not be displayed]';
  }
};
const getMessageTimestamp = (message: MessageDocument): Timestamp => {
  return message.createdAt;
};
const isMessageRead = (message: MessageDocument): boolean => {
  return message.read ?? false; // Use nullish coalescing for default
};
const isOwnMessage = (message: MessageDocument, currentUserId: string): boolean => {
  return message.senderId === currentUserId;
};

const isFirstInSequence = (messages: MessageDocument[], index: number): boolean => {
  if (index === 0) return true;
  return messages[index].senderId !== messages[index - 1].senderId;
};

const isLastInSequence = (messages: MessageDocument[], index: number): boolean => {
  if (index === messages.length - 1) return true;
  return messages[index].senderId !== messages[index + 1].senderId;
};
const getBubbleCornerClasses = (
  firstInSequence: boolean,
  lastInSequence: boolean,
  ownMessage: boolean
): string => {
  let classes = 'rounded-2xl';

  if (firstInSequence) {
    classes += ownMessage ? ' rounded-tr-none' : ' rounded-tl-none';
  }

  if (lastInSequence) {
    classes += ownMessage ? ' rounded-br-none' : ' rounded-bl-none';
  }

  return classes;
};
const truncateSenderId = (senderId: string, maxLength: number = 8): string => {
  if (senderId.length <= maxLength) {
    return senderId;
  }
  return `${senderId.substring(0, maxLength)}...`;
};
export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentUserId,
  loading = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect((): void => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 mb-6">
            <User className="w-16 h-16 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            No messages yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Send your first message to start the conversation!
          </p>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-1">
        {messages.map((message: MessageDocument, index: number) => {
          const ownMessage = isOwnMessage(message, currentUserId);
          const firstInSequence = isFirstInSequence(messages, index);
          const lastInSequence = isLastInSequence(messages, index);
          const bubbleCornerClasses = getBubbleCornerClasses(
            firstInSequence,
            lastInSequence,
            ownMessage
          );
          const messageRead = isMessageRead(message);

          return (
            <motion.div
              key={message.id || `msg-${message.senderId}-${index}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className={`flex ${ownMessage ? 'justify-end' : 'justify-start'} ${
                firstInSequence ? 'mt-4' : ''
              }`}
            >
              <div
                className={`max-w-[70%] flex flex-col ${
                  ownMessage ? 'items-end' : 'items-start'
                }`}
              >
                {/* Message bubble */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`px-4 py-3 shadow-sm ${bubbleCornerClasses} ${
                    ownMessage
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  {/* Message text */}
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {getMessageText(message)}
                  </p>

                  {/* Message metadata (time + read status) */}
                  <div
                    className={`flex items-center gap-2 mt-1 ${
                      ownMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        ownMessage
                          ? 'text-white/70'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatMessageTime(getMessageTimestamp(message))}
                    </span>

                    {/* Read receipts for own messages */}
                    {ownMessage && (
                      <div className="flex items-center">
                        {messageRead ? (
                          <CheckCheck 
                            className="w-3 h-3 text-white/70" 
                            aria-label="Message read"
                          />
                        ) : (
                          <Check 
                            className="w-3 h-3 text-white/70"
                            aria-label="Message sent"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {!ownMessage && firstInSequence && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                    {truncateSenderId(message.senderId)}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} className="h-px" aria-hidden="true" />
      </div>
    </div>
  );
};