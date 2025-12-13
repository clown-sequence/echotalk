import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Clock } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Firestore Timestamp type - represents a point in time
 * Can be either a Firestore Timestamp object or a serialized version
 */
interface FirestoreTimestamp {
  toDate?: () => Date;
  toMillis?: () => number;
  _seconds?: number;
  _nanoseconds?: number;
}

/**
 * User document from Firestore
 * Represents a user in the chat application
 */
export interface UserDocument {
  uid: string;              // Unique user identifier
  displayName: string;      // User's display name
  userImg?: string;         // Optional profile image URL
  email?: string;           // User's email
  createdAt?: FirestoreTimestamp;
}

/**
 * Message structure in chat room
 */
interface Message {
  text: string;
  senderId: string;
  timestamp: FirestoreTimestamp;
  id?: string;
}

/**
 * Chat room document from Firestore
 * Represents a conversation between users
 */
export interface ChatRoomDocument {
  id: string;                    // Chat room unique identifier
  participants: string[];        // Array of user IDs in the chat
  lastMessage?: string | Message; // Last message (can be string or object)
  lastMessageTime?: FirestoreTimestamp | string | null;
  unreadCount?: Record<string, number>; // Object mapping userId to unread count
  createdAt?: FirestoreTimestamp;
}

/**
 * Enhanced chat room with additional computed properties
 * Used internally to display chat list with user information
 * 
 * NOTE: We use Omit to remove 'unreadCount' from ChatRoomDocument
 * and redefine it as a number for the current user
 */
interface ChatRoomWithUser extends Omit<ChatRoomDocument, 'unreadCount'> {
  otherUser: UserDocument;   // The other user in the conversation (required after filtering)
  unreadCount: number;       // Normalized unread count for current user (not a Record)
}

/**
 * Props for the UsersList component
 */
export interface UsersListProps {
  users: UserDocument[];           // All available users
  chatRooms: ChatRoomDocument[];   // All chat rooms
  currentUserId: string;           // Current logged-in user ID
  view: 'chats' | 'users';        // Current view mode
  selectedUserId?: string;         // Currently selected user ID
  onSelectUser: (user: UserDocument) => void;  // Callback when user selected
  onSelectChatRoom: (roomId: string, otherUser: UserDocument) => void; // Callback when chat selected
  loading: boolean;                // Loading state
}

// ============================================
// PLACEHOLDER PRESENCE INDICATOR
// ============================================

/**
 * Placeholder PresenceIndicator component
 * Replace this with your actual implementation
 */
interface PresenceIndicatorProps {
  userId: string;
  showText: boolean;
  size: 'sm' | 'md';
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ userId, showText, size }) => {
  // Mock online status - replace with real presence logic
  const isOnline = Math.random() > 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className={`rounded-full ${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`} />
      {showText && (
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Converts various timestamp formats to milliseconds
 * Handles Firestore Timestamps, serialized timestamps, and date strings
 * 
 * @param timestamp - The timestamp to convert
 * @returns Number of milliseconds since epoch, or 0 if invalid
 * 
 * @example
 * getTimeInMillis(firestoreTimestamp) // 1234567890000
 * getTimeInMillis({ _seconds: 1234567890 }) // 1234567890000
 * getTimeInMillis("2024-01-01") // 1704067200000
 */
const getTimeInMillis = (timestamp: FirestoreTimestamp | string | null | undefined): number => {
  if (!timestamp) return 0;
  
  // Handle string types
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  
  // Handle Firestore Timestamp with toMillis method
  if ('toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // Handle serialized Firestore Timestamp with _seconds
  if ('_seconds' in timestamp && timestamp._seconds) {
    return timestamp._seconds * 1000;
  }
  
  return 0;
};

/**
 * Converts timestamp to Date object
 * 
 * @param timestamp - The timestamp to convert
 * @returns Date object or null if invalid
 */
const toDate = (timestamp: FirestoreTimestamp | string | null | undefined): Date | null => {
  if (!timestamp) return null;
  
  try {
    // Handle string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle Firestore Timestamp with toDate method
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Handle serialized timestamp with _seconds
    if ('_seconds' in timestamp && timestamp._seconds) {
      return new Date(timestamp._seconds * 1000);
    }
    
    return null;
  } catch (error) {
    console.warn('Error converting to date:', error);
    return null;
  }
};

/**
 * Formats a timestamp for display in the UI
 * Shows time (HH:mm) for today, relative time for other dates
 * 
 * @param timestamp - The timestamp to format
 * @returns Formatted string like "14:30" or "2 hours ago"
 * 
 * @example
 * formatLastMessageTime(todayTimestamp) // "14:30"
 * formatLastMessageTime(yesterdayTimestamp) // "1 day ago"
 */
const formatLastMessageTime = (timestamp: FirestoreTimestamp | string | null | undefined): string => {
  const date = toDate(timestamp);
  if (!date) return '';
  
  try {
    // Check if today
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      // Return time for today
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // Return relative time for other dates
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    console.warn('Error formatting time:', error);
    return '';
  }
};

/**
 * Safely extracts text from a message object or string
 * Handles both string messages and message objects with text property
 * 
 * @param lastMessage - The message to extract text from
 * @returns Formatted message text, truncated if necessary
 * 
 * @example
 * getLastMessageText("Hello") // "Hello"
 * getLastMessageText({ text: "Very long message..." }) // "Very long message... (truncated)"
 * getLastMessageText(null) // "No messages yet"
 */
const getLastMessageText = (lastMessage: string | Message | null | undefined): string => {
  if (!lastMessage) return 'No messages yet';
  
  // Handle string message
  if (typeof lastMessage === 'string') {
    return lastMessage.length > 40 ? lastMessage.substring(0, 40) + '...' : lastMessage;
  }
  
  // Handle message object
  if (typeof lastMessage === 'object' && 'text' in lastMessage && typeof lastMessage.text === 'string') {
    const text = lastMessage.text;
    return text.length > 40 ? text.substring(0, 40) + '...' : text;
  }
  
  return 'Tap to start chatting';
};

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * UsersList Component
 * 
 * Displays a list of either chat conversations or available users
 * depending on the view prop. Handles two main modes:
 * 
 * 1. 'chats' view: Shows active conversations sorted by recent activity
 * 2. 'users' view: Shows available users to start new conversations
 * 
 * Features:
 * - Real-time presence indicators
 * - Unread message counts
 * - Smooth animations
 * - Dark mode support
 * - Responsive design
 * 
 * @example
 * <UsersList
 *   users={allUsers}
 *   chatRooms={chatRooms}
 *   currentUserId="user123"
 *   view="chats"
 *   onSelectUser={handleUserSelect}
 *   onSelectChatRoom={handleChatSelect}
 *   loading={false}
 * />
 */
export const UsersList: React.FC<UsersListProps> = ({
  users,
  chatRooms,
  currentUserId,
  view,
  selectedUserId,
  onSelectUser,
  onSelectChatRoom,
  loading,
}) => {
  /**
   * MEMO 1: Enhance chat rooms with user information
   * 
   * For each chat room:
   * 1. Find the other participant (not the current user)
   * 2. Get that user's full information
   * 3. Extract unread count for current user
   * 4. Filter out rooms where we can't find the other user
   * 
   * This memoized value recalculates only when dependencies change
   */
  const chatRoomsWithUsers = useMemo<ChatRoomWithUser[]>(() => {
    return chatRooms
      .map(room => {
        // Find the other user in this chat (not current user)
        const otherUserId = room.participants.find(participantId => participantId !== currentUserId);
        
        // Get full user object for the other participant
        const otherUser = users.find(u => u.uid === otherUserId);
        
        // If we can't find the other user, return null
        if (!otherUser) return null;
        
        // Extract unread count for current user (default to 0)
        const unreadCountForUser = room.unreadCount?.[currentUserId] || 0;
        
        // Create the enhanced room object
        // We destructure to remove the original unreadCount and add our normalized one
        const { unreadCount: _, ...restOfRoom } = room;
        
        return {
          ...restOfRoom,
          otherUser,
          unreadCount: unreadCountForUser,
        } as ChatRoomWithUser;
      })
      // Filter out null values (rooms where we couldn't find the other user)
      .filter((room): room is ChatRoomWithUser => room !== null);
  }, [chatRooms, users, currentUserId]);

  /**
   * MEMO 2: Sort chat rooms by most recent activity
   * 
   * Sorts chat rooms in descending order by lastMessageTime
   * (most recent first). This ensures the most active chats
   * appear at the top of the list.
   */
  const sortedChatRooms = useMemo(() => {
    return [...chatRoomsWithUsers].sort((a, b) => {
      const timeA = getTimeInMillis(a.lastMessageTime);
      const timeB = getTimeInMillis(b.lastMessageTime);
      return timeB - timeA; // Descending order (newest first)
    });
  }, [chatRoomsWithUsers]);

  /**
   * MEMO 3: Filter users who don't have active chats
   * 
   * Creates a list of users who are NOT currently in any
   * chat room with the current user. These are potential
   * new conversation starters.
   */
  const usersWithoutChats = useMemo(() => {
    // Create a Set of all user IDs that are in chat rooms
    const chatUserIds = new Set(
      chatRooms.flatMap(room => room.participants)
    );
    
    // Filter users who are NOT in this Set
    return users.filter(user => 
      user.uid !== currentUserId && // Exclude current user
      !chatUserIds.has(user.uid)    // Exclude users in chats
    );
  }, [users, chatRooms, currentUserId]);

  // ============================================
  // LOADING STATE
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
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // CHATS VIEW
  // ============================================
  if (view === 'chats') {
    // Empty state for chats view
    if (sortedChatRooms.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-6"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
              <MessageCircle className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No conversations yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-xs">
            Start your first conversation by selecting a user from "Find Friends"
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Online</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      );
    }

    // Render chat list
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversations
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
              {sortedChatRooms.length}
            </span>
          </div>
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {sortedChatRooms.map(({ id, otherUser, lastMessage, lastMessageTime, unreadCount }) => {
              const isSelected = selectedUserId === otherUser.uid;
              const lastMessageText = getLastMessageText(lastMessage);
              const formattedTime = formatLastMessageTime(lastMessageTime);

              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => onSelectChatRoom(id, otherUser)}
                  className={`w-full p-4 border-b border-gray-100 dark:border-gray-800 text-left transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with presence indicator */}
                    <div className="relative flex-shrink-0">
                      <motion.div whileHover={{ scale: 1.1 }} className="relative">
                        <img
                          src={otherUser.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop'}
                          alt={otherUser.displayName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5">
                          <PresenceIndicator userId={otherUser.uid} showText={false} size="md" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Chat info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {otherUser.displayName}
                          </h3>
                          <PresenceIndicator userId={otherUser.uid} showText={true} size="sm" />
                        </div>
                        
                        {formattedTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            <Clock className="w-3 h-3" />
                            <span>{formattedTime}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${
                          unreadCount > 0
                            ? 'font-medium text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {lastMessageText}
                        </p>
                        
                        {unreadCount > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full shadow-sm"
                          >
                            {unreadCount}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ============================================
  // USERS VIEW
  // ============================================
  
  // Show users without chats, or all users if none available
  const displayUsers = usersWithoutChats.length > 0 ? usersWithoutChats : users.filter(u => u.uid !== currentUserId);

  // Empty state for users view
  if (displayUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20">
            <Users className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
          </div>
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No users found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-xs">
          All available users are already in your conversations.
        </p>
      </div>
    );
  }

  // Render user list
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Users
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
            {displayUsers.length}
          </span>
        </div>
      </div>
      
      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {displayUsers.map((user) => {
            const isSelected = selectedUserId === user.uid;

            return (
              <motion.button
                key={user.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onClick={() => onSelectUser(user)}
                className={`w-full p-4 border-b border-gray-100 dark:border-gray-800 text-left transition-all ${
                  isSelected 
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with presence indicator */}
                  <div className="relative flex-shrink-0">
                    <motion.div whileHover={{ scale: 1.1 }} className="relative">
                      <img
                        src={user.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop'}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <PresenceIndicator userId={user.uid} showText={false} size="md" />
                      </div>
                    </motion.div>
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.displayName}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <PresenceIndicator userId={user.uid} showText={true} size="sm" />
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        className="text-xs px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-sm"
                      >
                        Start chat
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};