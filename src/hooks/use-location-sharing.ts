import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, set, onValue, update, remove, type DatabaseReference, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../config/firebase';
import type { LocationData, UserLocation, FriendData } from '../types';

interface UseLocationSharingProps {
  userId: string | undefined;
  enabled: boolean;
}

interface UseLocationSharingReturn {
  location: LocationData | null;
  sharing: boolean;
  error: string | null;
  friendLocations: UserLocation[];
  watchedUsers: string[];
  startSharing: () => Promise<void>;
  stopSharing: () => Promise<void>;
  watchFriendLocation: (friendId: string, friendData: FriendData) => void;
  unwatchFriendLocation: (friendId: string) => void;
}

export const useLocationSharing = ({ 
  userId, 
  enabled 
}: UseLocationSharingProps): UseLocationSharingReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [watchedUsers, setWatchedUsers] = useState<Set<string>>(new Set());
  const [friendLocations, setFriendLocations] = useState<Map<string, UserLocation>>(new Map());
  
  const watchIdRef = useRef<number | null>(null);
  const listenersRef = useRef<Map<string, Unsubscribe>>(new Map());

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }, []);

  // Update location in Firebase
  const updateLocationInFirebase = useCallback(async (locationData: LocationData): Promise<void> => {
    if (!userId) return;

    try {
      const locationRef: DatabaseReference = ref(rtdb, `locations/${userId}`);
      await set(locationRef, {
        ...locationData,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Error updating location:', err);
      setError('Failed to update location');
    }
  }, [userId]);

  // Start sharing location
  const startSharing = useCallback(async (): Promise<void> => {
    if (!userId || !enabled) return;

    try {
      const position: GeolocationPosition = await getCurrentLocation();
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        sharing: true,
      };

      setLocation(locationData);
      await updateLocationInFirebase(locationData);
      setSharing(true);
      setError(null);

      // Watch position for continuous updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos: GeolocationPosition) => {
          const newLocation: LocationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
            sharing: true,
          };
          setLocation(newLocation);
          await updateLocationInFirebase(newLocation);
        },
        (err: GeolocationPositionError) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, [userId, enabled, getCurrentLocation, updateLocationInFirebase]);

  // Stop sharing location
  const stopSharing = useCallback(async (): Promise<void> => {
    if (!userId) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const locationRef: DatabaseReference = ref(rtdb, `locations/${userId}`);
      await update(locationRef, {
        sharing: false,
        timestamp: Date.now(),
      });
      setSharing(false);
    } catch (err) {
      console.error('Error stopping location sharing:', err);
    }
  }, [userId]);

  // Watch a friend's location
  const watchFriendLocation = useCallback((friendId: string, friendData: FriendData): void => {
    if (!friendId || watchedUsers.has(friendId)) return;

    const locationRef: DatabaseReference = ref(rtdb, `locations/${friendId}`);
    
    const unsubscribe: Unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val() as LocationData | null;
      if (data && data.sharing) {
        setFriendLocations((prev: Map<string, UserLocation>) => {
          const newMap = new Map(prev);
          newMap.set(friendId, {
            userId: friendId,
            userName: friendData.name,
            userImg: friendData.img,
            ...data,
          });
          return newMap;
        });
      } else {
        setFriendLocations((prev: Map<string, UserLocation>) => {
          const newMap = new Map(prev);
          newMap.delete(friendId);
          return newMap;
        });
      }
    });

    listenersRef.current.set(friendId, unsubscribe);
    setWatchedUsers((prev: Set<string>) => new Set(prev).add(friendId));
  }, [watchedUsers]);

  // Stop watching a friend's location
  const unwatchFriendLocation = useCallback((friendId: string): void => {
    const unsubscribe: Unsubscribe | undefined = listenersRef.current.get(friendId);
    if (unsubscribe) {
      unsubscribe();
      listenersRef.current.delete(friendId);
    }
    
    setWatchedUsers((prev: Set<string>) => {
      const newSet = new Set(prev);
      newSet.delete(friendId);
      return newSet;
    });

    setFriendLocations((prev: Map<string, UserLocation>) => {
      const newMap = new Map(prev);
      newMap.delete(friendId);
      return newMap;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      listenersRef.current.forEach((unsubscribe: Unsubscribe) => unsubscribe());
      if (userId && sharing) {
        const locationRef: DatabaseReference = ref(rtdb, `locations/${userId}`);
        remove(locationRef).catch(console.error);
      }
    };
  }, [userId, sharing]);

  return {
    location,
    sharing,
    error,
    friendLocations: Array.from(friendLocations.values()),
    watchedUsers: Array.from(watchedUsers),
    startSharing,
    stopSharing,
    watchFriendLocation,
    unwatchFriendLocation,
  };
};
