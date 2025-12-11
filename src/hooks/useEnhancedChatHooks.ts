// hooks/useEnhancedChatHooks.ts
// Enhanced custom hooks with rate limiting, caching, search, and auth checks

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastSeen: Date;
}

interface ChatRoom {
  id: string;
  participants: string[];
  participantDetails: { [uid: string]: { displayName: string; email: string } };
  createdAt: Date;
  lastMessageAt: Date;
  lastMessage?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: Date;
  read: boolean;
}

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

interface IFirebaseService {
  getCurrentUser(): AuthUser | null;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getUsers(excludeUid?: string): Promise<User[]>;
  getOrCreateChatRoom(userId1: string, userId2: string): Promise<ChatRoom>;
  getUserChatRooms(userId: string): Promise<ChatRoom[]>;
  getMessages(chatRoomId: string): Promise<Message[]>;
  sendMessage(chatRoomId: string, senderId: string, text: string): Promise<Message>;
  markMessagesAsRead(chatRoomId: string, userId: string): Promise<void>;
  onMessagesChange(chatRoomId: string, callback: (messages: Message[]) => void): () => void;
  onChatRoomsChange(userId: string, callback: (rooms: ChatRoom[]) => void): () => void;
}

// Import your firebase service
declare const firebaseService: IFirebaseService;

// ============================================================================
// RATE LIMITER UTILITY
// ============================================================================

/**
 * Rate Limiter Class
 * Implements sliding window algorithm to prevent excessive API calls
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter(5, 60000); // 5 requests per minute
 * if (limiter.isAllowed('user123')) {
 *   // Make API call
 * } else {
 *   console.log(`Wait ${limiter.getTimeUntilReset('user123')}ms`);
 * }
 * ```
 */
class RateLimiter {
  private actions: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if an action is allowed for a given key
   * @param key - Identifier (usually userId or action type)
   * @returns true if action is allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const userActions = this.actions.get(key) || [];
    
    // Filter out expired timestamps
    const recentActions = userActions.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentActions.length >= this.limit) {
      return false;
    }
    
    // Add current action
    recentActions.push(now);
    this.actions.set(key, recentActions);
    return true;
  }

  /**
   * Get remaining allowed actions
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const userActions = this.actions.get(key) || [];
    const recentActions = userActions.filter(
      timestamp => now - timestamp < this.windowMs
    );
    return Math.max(0, this.limit - recentActions.length);
  }

  /**
   * Get milliseconds until rate limit resets
   */
  getTimeUntilReset(key: string): number {
    const userActions = this.actions.get(key) || [];
    if (userActions.length === 0) return 0;
    
    const oldestAction = Math.min(...userActions);
    const resetTime = oldestAction + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clear rate limit for a specific key
   */
  reset(key: string): void {
    this.actions.delete(key);
  }

  /**
   * Clear all rate limits
   */
  resetAll(): void {
    this.actions.clear();
  }
}

// Global rate limiters
const userFetchLimiter = new RateLimiter(3, 60000); // 3 fetches per minute
const messageLimiter = new RateLimiter(10, 60000); // 10 messages per minute
const chatRoomLimiter = new RateLimiter(5, 60000); // 5 room creations per minute

// ============================================================================
// CACHE UTILITY
// ============================================================================

/**
 * Simple cache implementation with TTL (Time To Live)
 * Prevents redundant API calls by storing results temporarily
 * 
 * @example
 * ```typescript
 * const cache = new Cache<User[]>(300000); // 5 minute TTL
 * const cached = cache.get('users');
 * if (!cached) {
 *   const users = await fetchUsers();
 *   cache.set('users', users);
 * }
 * ```
 */
class Cache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 300000) { // Default 5 minutes
    this.ttl = ttl;
  }

  /**
   * Get cached data if still valid
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store data in cache
   * @param key - Cache key
   * @param data - Data to cache
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if cache has valid data
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global caches
const usersCache = new Cache<User[]>(300000); // 5 minutes
const chatRoomsCache = new Cache<ChatRoom[]>(60000); // 1 minute
const messagesCache = new Cache<Message[]>(30000); // 30 seconds

// ============================================================================
// ENHANCED HOOK 1: useAuth with Authentication Check
// ============================================================================

/**
 * Enhanced useAuth Hook
 * Manages authentication with automatic status checking
 * 
 * @returns Authentication state and methods with auth checker
 * 
 * @example
 * ```typescript
 * const { user, loading, signIn, signOut, isAuthenticated, requireAuth } = useAuth();
 * 
 * // Use requireAuth before protected actions
 * const handleAction = () => {
 *   if (!requireAuth()) return; // Shows alert if not authenticated
 *   // Proceed with action
 * };
 * ```
 */
export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const currentUser = firebaseService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const authUser = await firebaseService.signIn(email, password);
      setUser(authUser);
      return authUser;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseService.signOut();
      setUser(null);
      // Clear all caches on sign out
      usersCache.clear();
      chatRoomsCache.clear();
      messagesCache.clear();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback((): boolean => {
    return user !== null;
  }, [user]);

  /**
   * Require authentication - returns false and shows alert if not authenticated
   * Useful for protecting actions
   */
  const requireAuth = useCallback((message?: string): boolean => {
    if (!user) {
      alert(message || 'You must be signed in to perform this action');
      return false;
    }
    return true;
  }, [user]);

  /**
   * Check if specific user ID matches current user
   */
  const isCurrentUser = useCallback((uid: string): boolean => {
    return user?.uid === uid;
  }, [user]);

  return { 
    user, 
    loading, 
    error,
    signIn, 
    signOut, 
    isAuthenticated,
    requireAuth,
    isCurrentUser
  };
};

// ============================================================================
// ENHANCED HOOK 2: useUsers with Rate Limiting, Cache & Search
// ============================================================================

/**
 * Enhanced useUsers Hook
 * Fetches users with rate limiting, caching, and search functionality
 * 
 * @param excludeUid - User ID to exclude (typically current user)
 * @param options - Configuration options
 * @returns Users data with search and filtering capabilities
 * 
 * @example
 * ```typescript
 * const { 
 *   users, 
 *   filteredUsers,
 *   loading, 
 *   searchQuery,
 *   setSearchQuery,
 *   refetch,
 *   rateLimitInfo
 * } = useUsers(currentUser?.uid, { enableCache: true });
 * 
 * // Search users
 * setSearchQuery('alice');
 * 
 * // Force refresh
 * refetch();
 * ```
 */
export const useUsers = (
  excludeUid?: string,
  options: {
    enableCache?: boolean;
    enableRateLimit?: boolean;
    searchFields?: ('displayName' | 'email')[];
  } = {}
) => {
  const {
    enableCache = true,
    enableRateLimit = true,
    searchFields = ['displayName', 'email']
  } = options;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchAttemptRef = useRef(0);

  /**
   * Fetch users with rate limiting and caching
   */
  const fetchUsers = useCallback(async (force: boolean = false) => {
    const cacheKey = `users_${excludeUid || 'all'}`;

    // Check cache first
    if (enableCache && !force) {
      const cached = usersCache.get(cacheKey);
      if (cached) {
        setUsers(cached);
        setLoading(false);
        return;
      }
    }

    // Check rate limit
    if (enableRateLimit && !force) {
      const rateLimitKey = `fetch_users_${excludeUid || 'all'}`;
      if (!userFetchLimiter.isAllowed(rateLimitKey)) {
        const waitTime = userFetchLimiter.getTimeUntilReset(rateLimitKey);
        const waitSeconds = Math.ceil(waitTime / 1000);
        setError(new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds.`));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    fetchAttemptRef.current += 1;

    try {
      const fetchedUsers = await firebaseService.getUsers(excludeUid);
      setUsers(fetchedUsers);
      
      // Cache the results
      if (enableCache) {
        usersCache.set(cacheKey, fetchedUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [excludeUid, enableCache, enableRateLimit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Filter users based on search query
   */
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return users.filter(user => {
      return searchFields.some(field => {
        const value = user[field]?.toLowerCase() || '';
        return value.includes(query);
      });
    });
  }, [users, searchQuery, searchFields]);

  /**
   * Force refetch users (bypasses cache and rate limit)
   */
  const refetch = useCallback(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  /**
   * Clear search and reset to all users
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  /**
   * Get rate limit information
   */
  const rateLimitInfo = useMemo(() => {
    const rateLimitKey = `fetch_users_${excludeUid || 'all'}`;
    return {
      remaining: userFetchLimiter.getRemaining(rateLimitKey),
      timeUntilReset: userFetchLimiter.getTimeUntilReset(rateLimitKey),
      isLimited: userFetchLimiter.getRemaining(rateLimitKey) === 0
    };
  }, [excludeUid, fetchAttemptRef.current]);

  return { 
    users, 
    filteredUsers,
    loading, 
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,
    refetch,
    rateLimitInfo,
    cacheStatus: {
      isCached: enableCache && usersCache.has(`users_${excludeUid || 'all'}`),
      cacheStats: usersCache.getStats()
    }
  };
};

// ============================================================================
// ENHANCED HOOK 3: useChatRooms with Cache & Search
// ============================================================================

/**
 * Enhanced useChatRooms Hook
 * Fetches chat rooms with caching and search by participant name
 * 
 * @param userId - Current user's ID
 * @param options - Configuration options
 * @returns Chat rooms with search functionality
 * 
 * @example
 * ```typescript
 * const { 
 *   chatRooms, 
 *   filteredChatRooms,
 *   searchQuery,
 *   setSearchQuery,
 *   totalUnread 
 * } = useChatRooms(user?.uid);
 * 
 * // Search chats
 * setSearchQuery('alice');
 * ```
 */
export const useChatRooms = (
  userId?: string,
  options: {
    enableCache?: boolean;
    enableRateLimit?: boolean;
  } = {}
) => {
  const {
    enableCache = true,
    enableRateLimit = true
  } = options;

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userId) {
      setChatRooms([]);
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      const cacheKey = `chatRooms_${userId}`;

      // Check cache
      if (enableCache) {
        const cached = chatRoomsCache.get(cacheKey);
        if (cached) {
          setChatRooms(cached);
          setLoading(false);
          // Still fetch in background to update
        }
      }

      // Check rate limit
      if (enableRateLimit) {
        if (!chatRoomLimiter.isAllowed(`fetch_rooms_${userId}`)) {
          if (!enableCache || !chatRoomsCache.has(cacheKey)) {
            setError(new Error('Rate limit exceeded'));
          }
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const rooms = await firebaseService.getUserChatRooms(userId);
        setChatRooms(rooms);
        
        if (enableCache) {
          chatRoomsCache.set(cacheKey, rooms);
        }
      } catch (err) {
        console.error('Error fetching chat rooms:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    // Real-time listener
    const unsubscribe = firebaseService.onChatRoomsChange(userId, (rooms) => {
      setChatRooms(rooms);
      if (enableCache) {
        chatRoomsCache.set(`chatRooms_${userId}`, rooms);
      }
    });

    return unsubscribe;
  }, [userId, enableCache, enableRateLimit]);

  /**
   * Filter chat rooms by participant name or last message
   */
  const filteredChatRooms = useMemo(() => {
    if (!searchQuery.trim() || !userId) {
      return chatRooms;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return chatRooms.filter(room => {
      // Get other participant's name
      const otherUserId = room.participants.find(id => id !== userId);
      const otherUser = otherUserId ? room.participantDetails[otherUserId] : null;
      
      // Search in display name, email, or last message
      return (
        otherUser?.displayName?.toLowerCase().includes(query) ||
        otherUser?.email?.toLowerCase().includes(query) ||
        room.lastMessage?.toLowerCase().includes(query)
      );
    });
  }, [chatRooms, searchQuery, userId]);

  /**
   * Calculate total unread messages
   */
  const totalUnread = useMemo(() => {
    return chatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
  }, [chatRooms]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return { 
    chatRooms, 
    filteredChatRooms,
    loading, 
    error,
    searchQuery,
    setSearchQuery,
    clearSearch,
    totalUnread
  };
};

// ============================================================================
// ENHANCED HOOK 4: useChat with Auth Check & Rate Limiting
// ============================================================================

/**
 * Enhanced useChat Hook
 * Manages chat with authentication checks and message rate limiting
 * 
 * @param currentUserId - Current user's ID
 * @param otherUserId - Other user's ID
 * @returns Chat data with enhanced controls
 * 
 * @example
 * ```typescript
 * const { 
 *   chatRoom, 
 *   messages, 
 *   sendMessage, 
 *   canSendMessage,
 *   messageRateLimit 
 * } = useChat(user?.uid, selectedUserId);
 * 
 * if (canSendMessage) {
 *   await sendMessage('Hello!');
 * } else {
 *   console.log(`Wait ${messageRateLimit.timeUntilReset}ms`);
 * }
 * ```
 */
export const useChat = (currentUserId?: string, otherUserId?: string) => {
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sendAttemptRef = useRef(0);

  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      setChatRoom(null);
      setMessages([]);
      return;
    }

    const initChat = async () => {
      setLoading(true);
      setError(null);

      try {
        const room = await firebaseService.getOrCreateChatRoom(
          currentUserId,
          otherUserId
        );
        setChatRoom(room);

        const initialMessages = await firebaseService.getMessages(room.id);
        setMessages(initialMessages);

        await firebaseService.markMessagesAsRead(room.id, currentUserId);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (!chatRoom) return;

    const unsubscribe = firebaseService.onMessagesChange(
      chatRoom.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
      }
    );

    return unsubscribe;
  }, [chatRoom]);

  /**
   * Send message with rate limiting and authentication check
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!chatRoom || !currentUserId || !text.trim()) {
      return;
    }

    // Check authentication
    if (!currentUserId) {
      throw new Error('You must be signed in to send messages');
    }

    // Check rate limit
    if (!messageLimiter.isAllowed(currentUserId)) {
      const waitTime = messageLimiter.getTimeUntilReset(currentUserId);
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before sending more messages.`);
    }

    setSending(true);
    setError(null);
    sendAttemptRef.current += 1;

    try {
      await firebaseService.sendMessage(chatRoom.id, currentUserId, text.trim());
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err as Error);
      throw err;
    } finally {
      setSending(false);
    }
  }, [chatRoom, currentUserId]);

  /**
   * Check if user can send message (not rate limited)
   */
  const canSendMessage = useMemo(() => {
    if (!currentUserId) return false;
    return messageLimiter.getRemaining(currentUserId) > 0;
  }, [currentUserId, sendAttemptRef.current]);

  /**
   * Get message rate limit info
   */
  const messageRateLimit = useMemo(() => {
    if (!currentUserId) {
      return { remaining: 0, timeUntilReset: 0, isLimited: true };
    }
    return {
      remaining: messageLimiter.getRemaining(currentUserId),
      timeUntilReset: messageLimiter.getTimeUntilReset(currentUserId),
      isLimited: messageLimiter.getRemaining(currentUserId) === 0
    };
  }, [currentUserId, sendAttemptRef.current]);

  return { 
    chatRoom, 
    messages, 
    sendMessage, 
    loading, 
    sending, 
    error,
    canSendMessage,
    messageRateLimit
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * useDebounce Hook
 * Delays updating a value until after specified delay
 * Useful for search inputs to reduce API calls
 * 
 * @example
 * ```typescript
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * // debouncedSearch updates 500ms after user stops typing
 * ```
 */
export const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  User,
  ChatRoom,
  Message,
  AuthUser,
  IFirebaseService
};

export {
  RateLimiter,
  Cache,
  userFetchLimiter,
  messageLimiter,
  chatRoomLimiter,
  usersCache,
  chatRoomsCache,
  messagesCache
};