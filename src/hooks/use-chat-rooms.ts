import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface ChatRoom {
  id: string;
  participants: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
  };
  unreadCount?: Record<string, number>;
}

interface UseChatRoomsOptions {
  currentUserId: string;
  enableRealtime?: boolean;
}

export const useChatRooms = ({
  currentUserId,
  enableRealtime = true,
}: UseChatRoomsOptions) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all chat rooms for current user
  const fetchChatRooms = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const chatRoomsRef = collection(db, 'chatRooms');
      const q = query(
        chatRoomsRef,
        where('participants', 'array-contains', currentUserId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const rooms: ChatRoom[] = [];
      
      querySnapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
      });
      
      setChatRooms(rooms);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Real-time listener for chat rooms
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    if (!enableRealtime) {
      fetchChatRooms();
      return;
    }

    setLoading(true);
    const chatRoomsRef = collection(db, 'chatRooms');
    const q = query(
      chatRoomsRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const rooms: ChatRoom[] = [];
        querySnapshot.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
        });
        setChatRooms(rooms);
        setLoading(false);
      },
      (err) => {
        console.error('Error in chat rooms listener:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId, enableRealtime, fetchChatRooms]);

  // Check if a chat room exists between two users
  const getChatRoomWithUser = useCallback(
    async (otherUserId: string): Promise<ChatRoom | null> => {
      if (!currentUserId || !otherUserId) return null;

      try {
        const chatRoomsRef = collection(db, 'chatRooms');
        const q = query(
          chatRoomsRef,
          where('participants', 'array-contains', currentUserId)
        );
        
        const querySnapshot = await getDocs(q);
        
        for (const docSnap of querySnapshot.docs) {
          const room = { id: docSnap.id, ...docSnap.data() } as ChatRoom;
          if (
            room.participants.length === 2 &&
            room.participants.includes(otherUserId)
          ) {
            return room;
          }
        }
        
        return null;
      } catch (err) {
        console.error('Error checking for existing chat room:', err);
        return null;
      }
    },
    [currentUserId]
  );

  // Create a new private chat room
  const createChatRoom = useCallback(
    async (otherUserId: string): Promise<ChatRoom | null> => {
      if (!currentUserId || !otherUserId) {
        throw new Error('Both user IDs are required');
      }

      try {
        // Check if room already exists
        const existingRoom = await getChatRoomWithUser(otherUserId);
        if (existingRoom) {
          return existingRoom;
        }

        // Create new room
        const chatRoomsRef = collection(db, 'chatRooms');
        const newRoom = {
          participants: [currentUserId, otherUserId].sort(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          unreadCount: {
            [currentUserId]: 0,
            [otherUserId]: 0,
          },
        };

        const docRef = await addDoc(chatRoomsRef, newRoom);
        
        return {
          id: docRef.id,
          ...newRoom,
        };
      } catch (err) {
        console.error('Error creating chat room:', err);
        throw err;
      }
    },
    [currentUserId, getChatRoomWithUser]
  );

  // Get or create chat room
  const getOrCreateChatRoom = useCallback(
    async (otherUserId: string): Promise<ChatRoom | null> => {
      const existingRoom = await getChatRoomWithUser(otherUserId);
      if (existingRoom) {
        return existingRoom;
      }
      return await createChatRoom(otherUserId);
    },
    [getChatRoomWithUser, createChatRoom]
  );

  return {
    chatRooms,
    loading,
    error,
    getChatRoomWithUser,
    createChatRoom,
    getOrCreateChatRoom,
    refetch: fetchChatRooms,
  };
};