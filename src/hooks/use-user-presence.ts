import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import type { UserPresence } from '../types';

interface UseUserPresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

export const useUserPresence = ({ userId, enabled = true }: UseUserPresenceOptions) => {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    if (!userId || !enabled) {
      setPresence(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const userRef = doc(db, 'users', userId);
    
    // Real-time listener for user presence
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setPresence(data.presence || {
            uid: userId,
            isOnline: false,
            lastSeen: null,
            lastActivity: null,
          });
        } else {
          setPresence(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user presence:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, enabled]);

  return { presence, loading };
};