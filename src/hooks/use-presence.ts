// ============================================
// hooks/use-presence.ts
// Enhanced version with improved error handling,
// retry logic, and better TypeScript types
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getFirestore,
  Timestamp 
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  onDisconnect, 
  set, 
  onValue,
  type DatabaseReference,
  DataSnapshot 
} from 'firebase/database';

// ============================================
// Type Definitions
// ============================================

/**
 * Firestore presence data structure
 */
interface FirestorePresence {
  isOnline: boolean;
  lastActivity?: Timestamp;
  lastSeen?: Timestamp;
}

/**
 * Realtime Database presence data structure
 */
interface RTDBPresence {
  isOnline: boolean;
  lastActivity?: number;
  lastSeen?: number;
}

/**
 * Hook configuration options
 */
interface UsePresenceOptions {
  /** Current user's unique identifier */
  userId: string | undefined;
  
  /** Enable/disable presence tracking */
  enabled?: boolean;
  
  /** Activity update throttle interval in ms (default: 60000) */
  activityThrottleMs?: number;
  
  /** Max retry attempts for failed operations (default: 3) */
  maxRetries?: number;
  
  /** Retry delay in ms (default: 1000) */
  retryDelayMs?: number;
  
  /** Enable debug logging (default: false) */
  debug?: boolean;
  
  /** Custom collection path (default: 'users') */
  collectionPath?: string;
  
  /** Custom RTDB status path (default: 'status') */
  statusPath?: string;
}

/**
 * Return type for usePresence hook
 */
interface UsePresenceReturn {
  /** Manually set user online */
  setOnline: () => Promise<void>;
  
  /** Manually set user offline */
  setOffline: () => Promise<void>;
  
  /** Manually update activity timestamp */
  updateActivity: () => Promise<void>;
}

// ============================================
// Main Hook Implementation
// ============================================

/**
 * Hook to manage user's online presence across Firestore and RTDB
 * 
 * Features:
 * - Automatic online/offline status management
 * - Activity tracking with throttling
 * - Disconnect handling via RTDB
 * - Page visibility detection
 * - Retry logic for failed operations
 * - Comprehensive error handling
 * 
 * @example
 * ```tsx
 * const { setOnline, setOffline } = usePresence({
 *   userId: currentUser?.uid,
 *   enabled: !!currentUser,
 *   activityThrottleMs: 30000, // 30 seconds
 *   debug: true
 * });
 * ```
 */
export const usePresence = ({
  userId,
  enabled = true,
  activityThrottleMs = 60000,
  maxRetries = 3,
  retryDelayMs = 1000,
  debug = false,
  collectionPath = 'users',
  statusPath = 'status'
}: UsePresenceOptions): UsePresenceReturn => {
  
  // ============================================
  // Refs and State
  // ============================================
  
  const db = getFirestore();
  const rtdb = getDatabase();
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSettingUpRef = useRef(false);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);
  const lastActivityUpdateRef = useRef<number>(0);
  
  // ============================================
  // Utility Functions
  // ============================================
  
  /**
   * Debug logger
   */
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[Presence]', ...args);
    }
  }, [debug]);
  
  /**
   * Error logger
   */
  const logError = useCallback((...args: any[]) => {
    console.error('[Presence Error]', ...args);
  }, []);
  
  /**
   * Retry wrapper for async operations
   */
  const withRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    retries = maxRetries
  ): Promise<T | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          logError(`${operationName} failed after ${retries} attempts:`, error);
          return null;
        }
        log(`${operationName} failed (attempt ${attempt}/${retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
    return null;
  }, [maxRetries, retryDelayMs, log, logError]);
  
  // ============================================
  // Core Presence Functions
  // ============================================
  
  /**
   * Set user status to online in both Firestore and RTDB
   */
  const setOnline = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    log('Setting user online:', userId);
    
    const userPresenceRef = doc(db, collectionPath, userId);
    const userStatusRef = ref(rtdb, `${statusPath}/${userId}`);
    
    // Update Firestore
    await withRetry(
      async () => {
        await setDoc(
          userPresenceRef,
          {
            presence: {
              isOnline: true,
              lastActivity: serverTimestamp(),
            } as FirestorePresence
          },
          { merge: true }
        );
      },
      'Firestore setOnline'
    );
    
    // Update RTDB
    await withRetry(
      async () => {
        await set(userStatusRef, {
          isOnline: true,
          lastActivity: Date.now(),
        } as RTDBPresence);
      },
      'RTDB setOnline'
    );
    
    log('User set to online successfully');
  }, [userId, db, rtdb, collectionPath, statusPath, withRetry, log]);
  
  /**
   * Set user status to offline in both Firestore and RTDB
   */
  const setOffline = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    log('Setting user offline:', userId);
    
    const userPresenceRef = doc(db, collectionPath, userId);
    const userStatusRef = ref(rtdb, `${statusPath}/${userId}`);
    
    // Update Firestore
    await withRetry(
      async () => {
        await setDoc(
          userPresenceRef,
          {
            presence: {
              isOnline: false,
              lastSeen: serverTimestamp(),
            } as FirestorePresence
          },
          { merge: true }
        );
      },
      'Firestore setOffline'
    );
    
    // Update RTDB
    await withRetry(
      async () => {
        await set(userStatusRef, {
          isOnline: false,
          lastSeen: Date.now(),
        } as RTDBPresence);
      },
      'RTDB setOffline'
    );
    
    log('User set to offline successfully');
  }, [userId, db, rtdb, collectionPath, statusPath, withRetry, log]);
  
  /**
   * Update last activity timestamp (throttled)
   */
  const updateActivity = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    // Throttle updates
    const now = Date.now();
    if (now - lastActivityUpdateRef.current < activityThrottleMs) {
      log('Activity update throttled');
      return;
    }
    
    lastActivityUpdateRef.current = now;
    log('Updating activity timestamp');
    
    const userPresenceRef = doc(db, collectionPath, userId);
    
    await withRetry(
      async () => {
        await setDoc(
          userPresenceRef,
          {
            presence: {
              lastActivity: serverTimestamp(),
            } as Partial<FirestorePresence>
          },
          { merge: true }
        );
      },
      'Activity update'
    );
    
    log('Activity updated successfully');
  }, [userId, db, collectionPath, activityThrottleMs, withRetry, log]);
  
  // ============================================
  // Disconnect Handler Setup
  // ============================================
  
  /**
   * Setup RTDB disconnect handlers
   */
  const setupDisconnectHandler = useCallback((): (() => void) => {
    if (!userId) return () => {};
    
    const connectedRef: DatabaseReference = ref(rtdb, '.info/connected');
    const userStatusRef: DatabaseReference = ref(rtdb, `${statusPath}/${userId}`);
    
    log('Setting up disconnect handler');
    
    // Listen for connection state changes
    const unsubscribe = onValue(connectedRef, (snapshot: DataSnapshot) => {
      if (snapshot.val() === true) {
        log('Connected to RTDB');
        
        // Set online status
        setOnline();
        
        // Configure what happens on disconnect
        onDisconnect(userStatusRef)
          .set({
            isOnline: false,
            lastSeen: Date.now(),
          } as RTDBPresence)
          .then(() => {
            log('Disconnect handler configured successfully');
          })
          .catch((error) => {
            logError('Failed to set disconnect handler:', error);
          });
      } else {
        log('Disconnected from RTDB');
      }
    });
    
    return unsubscribe;
  }, [userId, rtdb, statusPath, setOnline, log, logError]);
  
  // ============================================
  // Event Handlers
  // ============================================
  
  /**
   * Handle page visibility changes
   */
  const handleVisibilityChange = useCallback((): void => {
    if (document.hidden) {
      log('Page hidden - setting offline');
      setOffline();
    } else {
      log('Page visible - setting online');
      setOnline();
    }
  }, [setOnline, setOffline, log]);
  
  /**
   * Handle user activity with debouncing
   */
  const handleActivity = useCallback((): void => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Debounce activity updates
    activityTimeoutRef.current = setTimeout(() => {
      updateActivity();
    }, 1000); // Wait 1 second after last activity
  }, [updateActivity]);
  
  /**
   * Handle page unload
   */
  const handleBeforeUnload = useCallback((): void => {
    log('Page unloading - setting offline');
    if (userId) {
      // Note: This might not complete before page unload
      setOffline();
    }
  }, [userId, db, collectionPath, setOffline, log]);
  
  // ============================================
  // Main Effect
  // ============================================
  
  useEffect(() => {
    // Guard clauses
    if (!userId || !enabled || isSettingUpRef.current) {
      return;
    }
    
    isSettingUpRef.current = true;
    log('Initializing presence system for user:', userId);
    
    // Initialize presence
    setOnline();
    
    // Setup disconnect handler
    const unsubscribeConnection = setupDisconnectHandler();
    unsubscribeConnectionRef.current = unsubscribeConnection;
    
    // Setup event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity); // Mobile support
    
    log('Presence system initialized successfully');
    
    // Cleanup function
    return () => {
      log('Cleaning up presence system for user:', userId);
      
      // Set offline status
      setOffline();
      
      // Clear timeouts
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      
      // Unsubscribe from connection listener
      if (unsubscribeConnectionRef.current) {
        unsubscribeConnectionRef.current();
        unsubscribeConnectionRef.current = null;
      }
      
      isSettingUpRef.current = false;
      log('Presence system cleanup complete');
    };
  }, [
    userId,
    enabled,
    setOnline,
    setOffline,
    setupDisconnectHandler,
    handleVisibilityChange,
    handleBeforeUnload,
    handleActivity,
    log
  ]);
  
  // ============================================
  // Return API
  // ============================================
  
  return {
    setOnline,
    setOffline,
    updateActivity
  };
};

// ============================================
// Export types for external use
// ============================================

export type { 
  UsePresenceOptions, 
  UsePresenceReturn,
  FirestorePresence,
  RTDBPresence 
};