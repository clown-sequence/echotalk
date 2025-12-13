// ============================================
// components/MessagesList.tsx
// Type-safe messages list with proper timestamp handling
// ============================================

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, User } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// Type Definitions
// ============================================

/**
 * Message document structure
 */
export interface MessageDocument {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
}

/**
 * Raw Firestore timestamp format (fallback)
 */
interface FirestoreRawTimestamp {
  _seconds: number;
  _nanoseconds?: number;
}

/**
 * Union type for all possible timestamp formats
 */
type TimestampValue = Timestamp | Date | string | number | FirestoreRawTimestamp | null | undefined;

/**
 * Result of timestamp parsing
 */
interface MessageTimeResult {
  date: Date | null;
  isValid: boolean;
}

/**
 * Component props
 */
interface MessagesListProps {
  messages: MessageDocument[];
  currentUserId: string;
  loading?: boolean;
}

/**
 * Motion animation variants
 */
const isFirestoreTimestamp = (value: unknown): value is Timestamp => {
  return (
    value instanceof Timestamp ||
    (typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as Record<string, unknown>).toDate === 'function')
  );
};

/**
 * Type guard to check if value is raw Firestore timestamp format
 */
const isRawFirestoreTimestamp = (value: unknown): value is FirestoreRawTimestamp => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_seconds' in value &&
    typeof (value as FirestoreRawTimestamp)._seconds === 'number'
  );
};

/**
 * Safely extract date from various timestamp formats
 */
const getDateFromTimestamp = (timestamp: TimestampValue): MessageTimeResult => {
  try {
    // Handle null/undefined
    if (timestamp == null) {
      return { date: null, isValid: false };
    }

    // Handle Firestore Timestamp
    if (isFirestoreTimestamp(timestamp)) {
      const date = timestamp.toDate();
      return { date, isValid: date instanceof Date && !isNaN(date.getTime()) };
    }

    // Handle Date object
    if (timestamp instanceof Date) {
      return { date: timestamp, isValid: !isNaN(timestamp.getTime()) };
    }

    // Handle string or number
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return { date, isValid: !isNaN(date.getTime()) };
    }

    // Handle raw Firestore format
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

/**
 * Format message time to relative time (e.g., "2 hours ago")
 */
const formatMessageTime = (timestamp: TimestampValue): string => {
  const { date, isValid } = getDateFromTimestamp(timestamp);

  if (!isValid || !date) {
    return '';
  }

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '';
  }
};

/**
 * Safely get message text with proper typing
 */
const getMessageText = (message: MessageDocument): string => {
  // Handle string
  if (typeof message.text === 'string') {
    return message.text;
  }

  // Handle undefined or null
  if (message.text == null) {
    return '';
  }

  // Handle other types (convert to string)
  try {
    return String(message.text);
  } catch (error) {
    console.warn('Error converting message text to string:', error);
    return '[Message could not be displayed]';
  }
};

/**
 * Get timestamp from message
 */
const getMessageTimestamp = (message: MessageDocument): Timestamp => {
  return message.createdAt;
};

/**
 * Determine if message is from current user
 */
const isOwnMessage = (message: MessageDocument, currentUserId: string): boolean => {
  return message.senderId === currentUserId;
};

/**
 * Check if current message is first in a sequence from the same sender
 */
const isFirstInSequence = (messages: MessageDocument[], index: number): boolean => {
  if (index === 0) return true;
  return messages[index].senderId !== messages[index - 1].senderId;
};

/**
 * Check if current message is last in a sequence from the same sender
 */
const isLastInSequence = (messages: MessageDocument[], index: number): boolean => {
  if (index === messages.length - 1) return true;
  return messages[index].senderId !== messages[index + 1].senderId;
};

/**
 * Generate bubble corner radius classes
 */
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

/**
 * Truncate sender ID for display
 */
const truncateSenderId = (senderId: string, maxLength: number = 8): string => {
  if (senderId.length <= maxLength) {
    return senderId;
  }
  return `${senderId.substring(0, maxLength)}...`;
};

// ============================================
// Component Implementation
// ============================================

/**
 * MessagesList Component
 * 
 * Displays a list of messages with:
 * - Auto-scroll to bottom
 * - Message grouping by sender
 * - Read receipts
 * - Relative timestamps
 * - Animations
 * 
 * @example
 * ```tsx
 * <MessagesList
 *   messages={messages}
 *   currentUserId={user.uid}
 *   loading={isLoading}
 * />
 * ```
 */
export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentUserId,
  loading = false,
}) => {
  // ============================================
  // Refs
  // ============================================
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Effects
  // ============================================
  
  /**
   * Auto-scroll to bottom when messages change
   */
  useEffect((): void => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages]);

  // ============================================
  // Render: Loading State
  // ============================================
  
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

  // ============================================
  // Render: Empty State
  // ============================================
  
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

  // ============================================
  // Render: Messages List
  // ============================================
  
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
                  className={`px-4 py-3 ${bubbleCornerClasses} ${
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
                        {message.read ? (
                          <CheckCheck className="w-3 h-3 text-white/70" />
                        ) : (
                          <Check className="w-3 h-3 text-white/70" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Sender name for first message in sequence from other users */}
                {!ownMessage && firstInSequence && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                    {truncateSenderId(message.senderId)}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-px" />
      </div>
    </div>
  );
};
