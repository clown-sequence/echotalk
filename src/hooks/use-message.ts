import { useState, useEffect, useCallback, useRef } from 'react';
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
  getDoc,
  writeBatch,
  serverTimestamp,
  DocumentSnapshot,
  QuerySnapshot,
  type DocumentData,
  type Unsubscribe,
  FirestoreError,
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface MessageDocument {
  id: string;
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
}

/**
 * Message data for creation (before Firestore adds id)
 */
export interface MessageData {
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt: FieldValue;
  read: boolean;
}

export interface RawMessageData extends DocumentData {
  chatRoomId: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp;
  read?: boolean;
}

export interface ChatRoomDocument extends DocumentData {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
  updatedAt?: Timestamp;
  unreadCount?: Record<string, number>;
}

export interface UseMessagesOptions {
  chatRoomId: string | null;
  currentUserId: string;
}

export interface UseMessagesReturn {
  messages: MessageDocument[];
  loading: boolean;
  error: Error | null;
  sending: boolean;
  sendMessage: (text: string) => Promise<boolean>;
}

export const useMessages = ({ 
  chatRoomId, 
  currentUserId 
}: UseMessagesOptions): UseMessagesReturn => {
  
  // ============================================
  // State Management
  // ============================================
  
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState<boolean>(false);  
  const isMarkingAsReadRef = useRef<boolean>(false);
  const markMessagesAsRead = useCallback(
    async (msgs: MessageDocument[]): Promise<void> => {
      if (!chatRoomId || !currentUserId || isMarkingAsReadRef.current) {
        return;
      }

      const unreadMessages = msgs.filter(
        (msg: MessageDocument) => !msg.read && msg.senderId !== currentUserId
      );

      if (unreadMessages.length === 0) {
        return;
      }

      isMarkingAsReadRef.current = true;

      try {
        const batch = writeBatch(db);

        unreadMessages.forEach((msg: MessageDocument): void => {
          const msgRef = doc(db, 'messages', msg.id);
          batch.update(msgRef, { read: true });
        });

        const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
        batch.update(chatRoomRef, {
          [`unreadCount.${currentUserId}`]: 0
        });

        await batch.commit();
        
        console.log(`Marked ${unreadMessages.length} messages as read`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error marking messages as read:', error);
      } finally {
        isMarkingAsReadRef.current = false;
      }
    },
    [chatRoomId, currentUserId]
  );

  /**
   * Convert raw Firestore data to MessageDocument type
   */
  const convertToMessageDocument = useCallback(
    (docId: string, data: RawMessageData): MessageDocument => {
      return {
        id: docId,
        chatRoomId: data.chatRoomId,
        senderId: data.senderId,
        text: data.text,
        createdAt: data.createdAt || Timestamp.now(),
        read: data.read || false
      };
    },
    []
  );
  
  // ============================================
  // Real-time Message Subscription
  // ============================================
  
  useEffect((): (() => void) | undefined => {
    // Guard clause: no chat room selected
    if (!chatRoomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'asc')
    );

    // Subscribe to real-time updates
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>): void => {
        const fetchedMessages: MessageDocument[] = [];
        
        querySnapshot.forEach((docSnapshot): void => {
          const data = docSnapshot.data() as RawMessageData;
          const message = convertToMessageDocument(docSnapshot.id, data);
          fetchedMessages.push(message);
        });
        
        setMessages(fetchedMessages);
        setLoading(false);
        
        // Mark messages as read (now properly declared before use)
        void markMessagesAsRead(fetchedMessages);
      },
      (err: FirestoreError): void => {
        const error = new Error(`Failed to fetch messages: ${err.message}`);
        console.error('Error fetching messages:', err);
        setError(error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return (): void => {
      unsubscribe();
    };
  }, [chatRoomId, currentUserId, markMessagesAsRead, convertToMessageDocument]);

  // ============================================
  // Send Message Function
  // ============================================
  
  /**
   * Send a new message to the chat room
   * @param text - Message text content
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      // Validation
      if (!chatRoomId || !currentUserId || !text.trim()) {
        console.warn('Invalid message send attempt:', { chatRoomId, currentUserId, text });
        return false;
      }

      setSending(true);
      setError(null);

      try {
        const messagesRef = collection(db, 'messages');
        const chatRoomRef = doc(db, 'chatRooms', chatRoomId);

        // Get chat room document to find other participant
        const chatRoomSnapshot: DocumentSnapshot<DocumentData> = await getDoc(chatRoomRef);
        
        if (!chatRoomSnapshot.exists()) {
          throw new Error('Chat room not found');
        }

        const roomData = chatRoomSnapshot.data() as ChatRoomDocument;
        const otherUserId: string = roomData.participants.find(
          (id: string) => id !== currentUserId
        ) || '';

        if (!otherUserId) {
          throw new Error('Other participant not found in chat room');
        }

        // Create new message with proper typing
        const newMessage: MessageData = {
          chatRoomId,
          senderId: currentUserId,
          text: text.trim(),
          createdAt: serverTimestamp(),
          read: false,
        };

        // Add message to Firestore
        await addDoc(messagesRef, newMessage);

        // Update chat room metadata
        const chatRoomUpdate: Partial<ChatRoomDocument> = {
          lastMessage: text.trim(),
          lastMessageTime: serverTimestamp() as Timestamp,
          lastMessageSender: currentUserId,
          updatedAt: serverTimestamp() as Timestamp,
        };

        // Use dot notation for nested field update
        await updateDoc(chatRoomRef, {
          ...chatRoomUpdate,
          [`unreadCount.${otherUserId}`]: increment(1),
        });

        setSending(false);
        return true;
        
      } catch (err) {
        const error = err instanceof Error 
          ? err 
          : new Error(`Failed to send message: ${String(err)}`);
        
        console.error('Error sending message:', error);
        setError(error);
        setSending(false);
        return false;
      }
    },
    [chatRoomId, currentUserId]
  );

  // ============================================
  // Return Hook API
  // ============================================
  
  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
  };
};
