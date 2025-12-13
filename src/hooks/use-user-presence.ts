import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import type { UserPresence } from '../types';

interface UseUserPresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

interface UseUserPresenceReturn {
  presence: UserPresence | null;
  loading: boolean;
}

export const useUserPresence = ({ 
  userId, 
  enabled = true 
}: UseUserPresenceOptions): UseUserPresenceReturn => {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const db = getFirestore();

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    console.log('[UserPresence] Setting up listener for user:', userId);

    // Reference to the user document
    const userRef = doc(db, 'users', userId);
    
    /**
     * Real-time listener for user presence updates
     */
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Extract presence data or set default
          const userPresence: UserPresence = data.presence || {
            uid: userId,
            isOnline: false,
            lastSeen: null,
            lastActivity: null,
          };
          
          setPresence(userPresence);
          console.log('[UserPresence] Updated:', userPresence);
        } else {
          // User document doesn't exist
          console.warn('[UserPresence] User document not found:', userId);
          setPresence({
            uid: userId,
            isOnline: false,
            lastSeen: null,
            lastActivity: null,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('[UserPresence] Error fetching presence:', error);
        setPresence(null);
        setLoading(false);
      }
    );

    // Cleanup: Unsubscribe from listener
    return () => {
      console.log('[UserPresence] Cleaning up listener for user:', userId);
      unsubscribe();
    };
  }, [userId, enabled, db]);

  return { presence, loading };
};