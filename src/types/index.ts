// ============================================
// src/types/index.ts
// COMPLETE TYPE DEFINITIONS - NO DUPLICATES
// Single source of truth for the entire application
// ============================================

import type { User, UserCredential } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

// ============================================
// RE-EXPORTS FROM FIREBASE
// ============================================

/**
 * Re-export Firebase User type for convenience
 */
export type { User as FirebaseUser } from 'firebase/auth';

// ============================================
// USER TYPES
// ============================================

/**
 * User document stored in Firestore
 * Represents a user's profile and account information
 */
export interface UserDocument {
  uid: string;              // Firebase Auth UID (unique identifier)
  displayName: string;      // User's display name (required)
  email?: string;           // User's email address (optional - some auth providers don't provide it)
  role: 'user' | 'admin';
  userImg?: string | null;         // Profile image URL (optional)
  status?: 'online' | 'offline' | 'away';  // Current presence status
  createdAt?: Timestamp;    // Account creation timestamp
  updatedAt?: Timestamp;    // Last profile update timestamp
  lastSeen?: Timestamp;     // Last activity timestamp
}
export interface UpdateProfileData {
  displayName?: string;
  userImg?: string | null;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export interface PresenceDocument {
  uid: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
}

/**
 * Extended presence information with computed fields
 */
export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: Timestamp | null;
  lastActivity: Timestamp | null;
}

// ============================================
// CHAT ROOM TYPES
// ============================================

/**
 * Last message structure for chat room preview
 * Can be embedded in ChatRoomDocument
 */
export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: Timestamp;
}

/**
 * Chat room document from Firestore
 * Represents a conversation between two users
 * 
 * Note: lastMessage can be:
 * - string (simple text preview)
 * - LastMessage object (structured with metadata)
 * - undefined (no messages yet)
 */
export interface ChatRoomDocument {
  id: string;
  participants: string[];                      // Array of user UIDs [user1, user2]
  createdAt: Timestamp;                        // When chat was created
  lastMessage?: string | LastMessage;          // Last message preview (flexible format)
  lastMessageTime?: Timestamp;                 // Timestamp of last message
  lastMessageSender?: string;                  // UID of last message sender
  unreadCount?: Record<string, number>;        // Map of userId -> unread count
}

/**
 * Alias for consistency
 * Use either ChatRoomDocument or ChatRoom
 */
export type ChatRoom = ChatRoomDocument;

/**
 * Enhanced chat room with computed user information
 * Used internally after processing raw chat room data
 */
export interface ChatRoomWithUser extends Omit<ChatRoomDocument, 'unreadCount'> {
  otherUser: UserDocument;   // The other participant's full info
  unreadCount: number;       // Normalized unread count for current user
}

// ============================================
// MESSAGE TYPES
// ============================================

/**
 * Message document from Firestore
 * Represents a single message in a chat
 */
export interface MessageDocument {
  id: string;
  chatRoomId: string;        // Reference to parent chat room
  senderId: string;          // UID of message sender
  text: string;              // Message content
  createdAt: Timestamp;      // When message was sent
  read?: boolean;            // Read status (optional, defaults to false)
  type?: 'text' | 'image' | 'file';  // Message type
  imageUrl?: string;         // Image URL if type is 'image'
  fileUrl?: string;          // File URL if type is 'file'
  fileName?: string;         // Original filename if type is 'file'
}

/**
 * Alias for backward compatibility
 */
export type Message = MessageDocument;

// ============================================
// CALL TYPES (WebRTC)
// ============================================

/**
 * Type of call
 */
export type CallType = 'video' | 'audio';

/**
 * Constants for call types
 */
export const CALL_TYPE = {
  VIDEO: 'video' as CallType,
  AUDIO: 'audio' as CallType,
} as const;

/**
 * Possible call statuses
 */
export type CallStatus = 
  | 'idle'       // No active call
  | 'calling'    // Initiating call
  | 'ringing'    // Incoming call ringing
  | 'connected'  // Call in progress
  | 'declined'   // Call was declined
  | 'ended'      // Call ended normally
  | 'missed'     // Call was not answered
  | 'busy';      // User is in another call

/**
 * Constants for call statuses
 */
export const CALL_STATUS = {
  IDLE: 'idle' as CallStatus,
  CALLING: 'calling' as CallStatus,
  RINGING: 'ringing' as CallStatus,
  CONNECTED: 'connected' as CallStatus,
  DECLINED: 'declined' as CallStatus,
  ENDED: 'ended' as CallStatus,
  MISSED: 'missed' as CallStatus,
  BUSY: 'busy' as CallStatus,
} as const;

/**
 * WebRTC session description
 */
export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

/**
 * WebRTC ICE candidate
 */
export interface IceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

/**
 * Call document stored in Firestore
 * Represents a video/audio call session
 */
export interface CallDocument {
  id: string;
  callerId: string;
  callerName: string;
  callerImage: string;
  receiverId: string;
  receiverName: string;
  receiverImage: string;
  callType: CallType;
  status: CallStatus;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt: Timestamp | ReturnType<typeof import('firebase/firestore').serverTimestamp>;
}

/**
 * Extended call document with additional timing information
 */
export interface CallDocumentExtended extends Omit<CallDocument, 'offer' | 'answer'> {
  offer?: SessionDescription;
  answer?: SessionDescription;
  startedAt?: Timestamp;    // When call was answered
  endedAt?: Timestamp;      // When call ended
  duration?: number;        // Call duration in seconds
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  sharing: boolean;
}
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  sharing: boolean;
}

export interface UserLocation extends LocationData {
  userId: string;
  userName: string;
  userImg?: string;
}

export interface FriendData {
  name: string;
  img?: string;
}

export interface CallState {
  isInCall: boolean;
  callId: string | null;
  callType: CallType | null;
  status: CallStatus;
  isCaller: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  otherUser: {
    uid: string;
    displayName: string;
    userImg?: string;
  } | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

/**
 * Call notification data
 * Used for displaying incoming call UI
 */
export interface CallNotification {
  callId: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  callType: CallType;
  timestamp: number;
}

/**
 * WebRTC configuration
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

/**
 * Credentials for signing in
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Credentials for signing up
 */
export interface SignUpCredentials extends SignInCredentials {
  displayName?: string;
}

/**
 * Data for updating password
 */
export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Authentication error response
 */
export interface AuthErrorResponse {
  code: string;
  message: string;
}

/**
 * Authentication context type
 * Provided by AuthContext
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthErrorResponse | null;
  isOnline: boolean;
  signIn: (credentials: SignInCredentials) => Promise<UserCredential>;
  signUp: (credentials: SignUpCredentials) => Promise<UserCredential>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserProfile: (data: UpdateProfileData) => Promise<void>;
  updateUserPassword: (data: UpdatePasswordData) => Promise<void>;
  isAuthenticated: boolean;
  getUserId: () => string | null;
  getUserEmail: () => string | null;
  getUserDisplayName: () => string | null;
  getUserDoc: () => Promise<UserDocument | null>;
}

// ============================================
// COMPONENT PROPS TYPES
// ============================================

/**
 * Props for UsersList component
 */
export interface UsersListProps {
  users: UserDocument[];
  chatRooms: ChatRoomDocument[];
  currentUserId: string;
  view: 'chats' | 'users';
  selectedUserId?: string;
  onSelectUser: (user: UserDocument) => void;
  onSelectChatRoom: (roomId: string, otherUser: UserDocument) => void;
  loading: boolean;
}

// ============================================
// HOOK OPTIONS AND RETURN TYPES
// ============================================

/**
 * Options for usePresence hook
 */
export interface UsePresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

/**
 * Return type for usePresence hook
 */
export interface UsePresenceReturn {
  presenceData: Record<string, PresenceDocument>;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => Date | null;
}

/**
 * Options for useUserPresence hook
 */
export interface UseUserPresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

/**
 * Return type for useUserPresence hook
 */
export interface UseUserPresenceReturn {
  presence: UserPresence | null;
  loading: boolean;
}

/**
 * Options for useUsers hook
 */
export interface UseUsersOptions {
  excludeUid?: string;
  enableRealtime?: boolean;
  checkChatRooms?: boolean;
  currentUserId?: string;
}

/**
 * Return type for useUsers hook
 */
export interface UseUsersReturn {
  users: UserDocument[];
  loading: boolean;
  error: string | null;
}

/**
 * Options for useChatRooms hook
 */
export interface UseChatRoomsOptions {
  currentUserId: string;
  enableRealtime?: boolean;
}

/**
 * Return type for useChatRooms hook
 */
export interface UseChatRoomsReturn {
  chatRooms: ChatRoom[];
  getOrCreateChatRoom: (otherUserId: string) => Promise<ChatRoom | null>;
  loading: boolean;
  error?: string | null;
}

/**
 * Options for useMessages hook
 */
export interface UseMessagesOptions {
  chatRoomId: string | null;
  currentUserId: string;
}

/**
 * Return type for useMessages hook
 */
export interface UseMessagesReturn {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  loading: boolean;
  error?: string | null;
}

/**
 * Options for useVideoCall hook
 */
export interface UseVideoCallOptions {
  currentUserId: string;
  onCallReceived?: (call: CallDocument) => void;
  onCallEnded?: () => void;
}

/**
 * Return type for useVideoCall hook
 */
export interface UseVideoCallReturn {
  callState: CallState;
  startCall: (
    receiverId: string,
    receiverName: string,
    receiverImage: string,
    callType: CallType
  ) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if timestamp is a Firestore Timestamp
 */
export const isFirestoreTimestamp = (value: unknown): value is Timestamp => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.toMillis === 'function' ||
    typeof obj.toDate === 'function' ||
    typeof obj.seconds === 'number'
  );
};

/**
 * Check if value is a valid UserDocument
 */
export const isValidUser = (user: UserDocument | null | undefined): user is UserDocument => {
  return (
    user !== null &&
    user !== undefined &&
    typeof user.uid === 'string' &&
    typeof user.displayName === 'string'
    // Email is optional, so we don't check it
  );
};

/**
 * Check if lastMessage is an object (not a string)
 */
export const isLastMessageObject = (value: unknown): value is LastMessage => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.text === 'string' &&
    typeof obj.senderId === 'string' &&
    isFirestoreTimestamp(obj.timestamp)
  );
};

/**
 * Check if value is a valid MessageDocument
 */
export const isMessageDocument = (value: unknown): value is MessageDocument => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.senderId === 'string' &&
    typeof obj.chatRoomId === 'string' &&
    isFirestoreTimestamp(obj.createdAt)
  );
};

/**
 * Check if call status is a terminal state
 */
export const isCallTerminated = (status: CallStatus): boolean => {
  return ['ended', 'declined', 'missed'].includes(status);
};

/**
 * Check if call status is active
 */
export const isCallActive = (status: CallStatus): boolean => {
  return ['ringing', 'connected', 'calling'].includes(status);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Safely extract text from lastMessage (handles all formats)
 * 
 * @param lastMessage - Can be string, LastMessage object, or null
 * @returns The message text or a fallback string
 * 
 * @example
 * getLastMessageText("Hello") // "Hello"
 * getLastMessageText({ text: "Hi", senderId: "123", timestamp: now }) // "Hi"
 * getLastMessageText(null) // "No messages yet"
 */
export const getLastMessageText = (
  lastMessage: string | LastMessage | null | undefined
): string => {
  if (!lastMessage) {
    return 'No messages yet';
  }

  if (typeof lastMessage === 'string') {
    return lastMessage;
  }

  if (isLastMessageObject(lastMessage)) {
    return lastMessage.text;
  }

  return 'Tap to start chatting';
};

/**
 * Get timestamp from chat room (prefers lastMessageTime)
 * 
 * @param chatRoom - The chat room document
 * @returns Timestamp or null
 */
export const getChatRoomTimestamp = (
  chatRoom: ChatRoomDocument
): Timestamp | null => {
  if (chatRoom.lastMessageTime) {
    return chatRoom.lastMessageTime;
  }

  if (chatRoom.lastMessage && isLastMessageObject(chatRoom.lastMessage)) {
    return chatRoom.lastMessage.timestamp;
  }

  return chatRoom.createdAt || null;
};

/**
 * Assert that user is not null (throws if it is)
 * 
 * @param user - User that might be null
 * @param errorMessage - Custom error message
 * @returns Non-nullable user
 * @throws Error if user is null
 * 
 * @example
 * const validUser = assertUser(user, 'User must be logged in');
 */
export const assertUser = (
  user: UserDocument | User | null | undefined,
  errorMessage: string = 'User is required'
): UserDocument | User => {
  if (!user) {
    throw new Error(errorMessage);
  }
  return user;
};

/**
 * Get display name from User or UserDocument
 * 
 * @param user - Firebase User or UserDocument
 * @returns Display name or fallback
 */
export const getDisplayName = (user: User | UserDocument | null | undefined): string => {
  if (!user) return 'Guest';
  
  if ('displayName' in user && user.displayName) {
    return user.displayName;
  }
  
  if ('email' in user && user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
};

/**
 * Get user image URL from User or UserDocument
 * 
 * @param user - Firebase User or UserDocument
 * @returns Image URL or default
 */
export const getUserImage = (user: User | UserDocument | null | undefined): string => {
  const defaultImage = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop';
  
  if (!user) return defaultImage;
  
  if ('userImg' in user && user.userImg) {
    return user.userImg;
  }
  
  if ('photoURL' in user && user.photoURL) {
    return user.photoURL;
  }
  
  return defaultImage;
};

/**
 * Format call duration from seconds
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:23" or "12:34:56"
 */
export const formatCallDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert Timestamp to Date safely
 * 
 * @param timestamp - Firestore Timestamp or null
 * @returns Date object or null
 */
export const timestampToDate = (timestamp: Timestamp | null | undefined): Date | null => {
  if (!timestamp) return null;
  
  try {
    if (isFirestoreTimestamp(timestamp)) {
      return timestamp.toDate();
    }
    return null;
  } catch (error) {
    console.warn('Error converting timestamp to date:', error);
    return null;
  }
};