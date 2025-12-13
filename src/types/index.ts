import type { User, UserCredential } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
// ============================================
// types.ts - Complete Type Definitions (Fixed)
// ============================================

// Re-export Firebase User type
export type { User as FirebaseUser } from 'firebase/auth';

// User Types
export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  userImg?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Chat Room Types
export interface ChatRoomDocument {
  id: string;
  participants: string[];
  createdAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
  unreadCount?: Record<string, number>;
}

// Alias for compatibility
export type ChatRoom = ChatRoomDocument;

// Message Types
export interface MessageDocument {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  chatRoomId: string;
  read?: boolean;
}

// Presence Types
export interface PresenceDocument {
  uid: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
}

// Call Types
export enum CallType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

// Single definition of CallStatus (removed duplicate)
export enum CallStatus {
  IDLE = 'idle',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  DECLINED = 'declined',
  ENDED = 'ended',
  CALLING = 'calling',    // Added from second definition
  MISSED = 'missed',      // Added from second definition
  BUSY = 'busy',         // Added from second definition
}

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

// Hook Return Types
export interface UsePresenceReturn {
  presenceData: Record<string, PresenceDocument>;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => Date | null;
}

export interface UseUsersReturn {
  users: FirebaseUser[];
  loading: boolean;
  error: string | null;
}

export interface UseChatRoomsReturn {
  chatRooms: ChatRoomDocument[];
  loading: boolean;
  error: string | null;
  getOrCreateChatRoom: (otherUserId: string) => Promise<ChatRoomDocument | null>;
}

export interface UseMessagesReturn {
  messages: MessageDocument[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

// Component Props Types
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
export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  displayName?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  userImg?: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthErrorResponse {
  code: string;
  message: string;
}

// ============================================
// User Related Types
// ============================================

/**
 * User presence information
 */
export interface UserPresence {
  uid: string;
  isOnline: boolean;
  lastSeen: Timestamp | null;
  lastActivity: Timestamp | null;
}

// Note: UserDocument is already defined above, so removed duplicate here

// ============================================
// Chat Related Types
// ============================================

// Note: ChatRoom is already defined above as an alias to ChatRoomDocument

/**
 * Message document (alternative definition, merged with MessageDocument above)
 */
// Note: Message interface conflicts with MessageDocument above

// ============================================
// Hook Options Types
// ============================================

/**
 * Options for usePresence hook
 */
export interface UsePresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

/**
 * Options for useUserPresence hook
 */
export interface UseUserPresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
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
 * Options for useChatRooms hook
 */
export interface UseChatRoomsOptions {
  currentUserId: string;
  enableRealtime?: boolean;
}

/**
 * Options for useMessages hook
 */
export interface UseMessagesOptions {
  chatRoomId: string | null;
  currentUserId: string;
}

// ============================================
// Hook Return Types
// ============================================

/**
 * Return type for useUserPresence hook
 */
export interface UseUserPresenceReturn {
  presence: UserPresence | null;
  loading: boolean;
}

/**
 * Return type for useMessages hook
 */
export interface UseMessagesReturn {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  loading: boolean;
}

/**
 * Return type for useChatRooms hook
 */
export interface UseChatRoomsReturn {
  chatRooms: ChatRoom[];
  getOrCreateChatRoom: (otherUserId: string) => Promise<ChatRoom | null>;
  loading: boolean;
}

/**
 * Return type for useUsers hook
 */
export interface UseUsersReturn {
  users: UserDocument[];
  loading: boolean;
}

// ============================================
// Context Types
// ============================================

export interface AuthContextType {
  // State
  user: User | null;
  loading: boolean;
  error: AuthErrorResponse | null;
  isOnline: boolean;
  
  // Methods
  signIn: (credentials: SignInCredentials) => Promise<UserCredential>;
  signUp: (credentials: SignUpCredentials) => Promise<UserCredential>;
  logout: () => Promise<void>;
  clearError: () => void;
  
  // Profile update methods
  updateUserProfile: (data: UpdateProfileData) => Promise<void>;
  updateUserPassword: (data: UpdatePasswordData) => Promise<void>;
  
  // Helper methods
  isAuthenticated: boolean;
  getUserId: () => string | null;
  getUserEmail: () => string | null;
  getUserDisplayName: () => string | null;
  getUserDoc: () => Promise<UserDocument | null>;
}

/**
 * WebRTC ICE Candidate
 */
export interface IceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

/**
 * WebRTC Session Description
 */
export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

/**
 * Call document stored in Firestore
 */
export interface CallDocumentExtended {
  id: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  callerImage?: string;
  callType: CallType;
  status: CallStatus;
  offer?: SessionDescription;
  answer?: SessionDescription;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  duration?: number; // in seconds
}

/**
 * Call state for UI management
 */
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
  startCall: (receiverId: string, receiverName: string, receiverImage: string, callType: CallType) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

/**
 * WebRTC Configuration
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

/**
 * Call notification payload
 */
export interface CallNotification {
  callId: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  callType: CallType;
  timestamp: number;
}