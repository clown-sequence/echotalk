import { useEffect, useRef } from 'react';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  typeonDisconnect,
  getFirestore 
} from 'firebase/firestore';
import { getDatabase, ref, onDisconnect as rtdbOnDisconnect, set, onValue, onDisconnect } from 'firebase/database';

interface UsePresenceOptions {
  userId: string | undefined;
  enabled?: boolean;
}

export const usePresence = ({ userId, enabled = true }: UsePresenceOptions) => {
  const db = getFirestore();
  const rtdb = getDatabase();
  const presenceRef = useRef<any>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;

    console.log('Setting up presence for user:', userId);

    // Reference to user's presence document
    const userPresenceRef = doc(db, 'users', userId);
    const userStatusRef = ref(rtdb, `status/${userId}`);

    // Set user as online
    const setOnline = async () => {
      try {
        // Update Firestore
        await setDoc(userPresenceRef, {
          'presence.isOnline': true,
          'presence.lastActivity': serverTimestamp(),
        }, { merge: true });

        // Update Realtime Database for better presence detection
        await set(userStatusRef, {
          isOnline: true,
          lastActivity: Date.now(),
        });

        console.log('User set to online');
      } catch (error) {
        console.error('Error setting online status:', error);
      }
    };

    // Set user as offline
    const setOffline = async () => {
      try {
        await setDoc(userPresenceRef, {
          'presence.isOnline': false,
          'presence.lastSeen': serverTimestamp(),
        }, { merge: true });

        await set(userStatusRef, {
          isOnline: false,
          lastSeen: Date.now(),
        });

        console.log('User set to offline');
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    };

    // Update last activity timestamp
    const updateActivity = async () => {
      if (!userId) return;
      
      try {
        await setDoc(userPresenceRef, {
          'presence.lastActivity': serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    };

    // Setup disconnect handler using Realtime Database
    const setupDisconnectHandler = () => {
      // Monitor connection state
      const connectedRef = ref(rtdb, '.info/connected');
      
      onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // We're connected (or reconnected)
          setOnline();
          
          // Set up disconnect handler
          rtdbOnDisconnect(userStatusRef).set({
            isOnline: false,
            lastSeen: Date.now(),
          }).then(() => {
            console.log('Disconnect handler set up successfully');
          });
          
          // Also update Firestore on disconnect
          onDisconnect(userPresenceRef).set({
            'presence.isOnline': false,
            'presence.lastSeen': serverTimestamp(),
          }, { merge: true });
        }
      });
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    // Handle user activity (mouse move, clicks, keyboard)
    const handleActivity = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Throttle activity updates to once per minute
      activityTimeoutRef.current = setTimeout(() => {
        updateActivity();
      }, 60000); // 1 minute
    };

    // Initialize presence
    setOnline();
    setupDisconnectHandler();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', setOffline);
    
    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);

    // Cleanup
    return () => {
      console.log('Cleaning up presence for user:', userId);
      setOffline();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', setOffline);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [userId, enabled]);
};

