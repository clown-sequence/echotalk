import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  increment,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
  type?: 'text' | 'image' | 'file';
}

interface UseMessagesOptions {
  chatRoomId: string | null;
  currentUserId: string;
}

export const useMessages = ({ chatRoomId, currentUserId }: UseMessagesOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);

  // Listen to messages in real-time
  useEffect(() => {
    if (!chatRoomId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatRoomId', '==', chatRoomId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(fetchedMessages);
        setLoading(false);
        
        // Mark messages as read
        markMessagesAsRead(fetchedMessages);
      },
      (err) => {
        console.error('Error fetching messages:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatRoomId, currentUserId]);

  // Mark unread messages as read
  const markMessagesAsRead = async (msgs: Message[]) => {
    if (!chatRoomId || !currentUserId) return;

    const unreadMessages = msgs.filter(
      msg => !msg.read && msg.senderId !== currentUserId
    );

    if (unreadMessages.length === 0) return;

    try {
      const batch = writeBatch(db);

      // Mark each message as read
      unreadMessages.forEach(msg => {
        const msgRef = doc(db, 'messages', msg.id);
        batch.update(msgRef, { read: true });
      });

      // Reset unread count for current user in chat room
      const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
      batch.update(chatRoomRef, {
        [`unreadCount.${currentUserId}`]: 0
      });

      await batch.commit();
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Send a new message
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!chatRoomId || !currentUserId || !text.trim()) {
        return false;
      }

      setSending(true);
      setError(null);

      try {
        const messagesRef = collection(db, 'messages');
        const chatRoomRef = doc(db, 'chatRooms', chatRoomId);

        // Get chat room to find other participant
        const chatRoomDoc = await getDocs(
          query(collection(db, 'chatRooms'), where('__name__', '==', chatRoomId))
        );
        
        let otherUserId = '';
        if (!chatRoomDoc.empty) {
          const roomData = chatRoomDoc.docs[0].data();
          otherUserId = roomData.participants.find((id: string) => id !== currentUserId) || '';
        }

        // Create new message
        const newMessage = {
          chatRoomId,
          senderId: currentUserId,
          text: text.trim(),
          timestamp: Timestamp.now(),
          read: false,
          type: 'text' as const,
        };

        await addDoc(messagesRef, newMessage);

        // Update chat room with last message and increment unread count for other user
        await updateDoc(chatRoomRef, {
          lastMessage: {
            text: text.trim(),
            senderId: currentUserId,
            timestamp: Timestamp.now(),
          },
          updatedAt: Timestamp.now(),
          [`unreadCount.${otherUserId}`]: increment(1),
        });

        setSending(false);
        return true;
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err as Error);
        setSending(false);
        return false;
      }
    },
    [chatRoomId, currentUserId]
  );

  // Delete a message (optional)
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        // Implementation for deleting messages
        // You can add this if needed
        return true;
      } catch (err) {
        console.error('Error deleting message:', err);
        return false;
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    deleteMessage,
  };
};