import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface User {
  uid: string;
  email: string;
  displayName: string | null;
  userImg: string | null;
  role: 'admin' | 'user';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  hasChatRoom?: boolean; // Added to track if chat room exists
}

interface UseUsersOptions {
  excludeUid?: string;
  searchQuery?: string;
  searchFields?: (keyof User)[];
  enableRealtime?: boolean;
  checkChatRooms?: boolean;
  currentUserId?: string;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const {
    excludeUid,
    searchQuery = '',
    searchFields = ['email', 'displayName'],
    enableRealtime = false,
    checkChatRooms = false,
    currentUserId,
  } = options;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Check which users have existing chat rooms
  const checkExistingChatRooms = useCallback(async (usersList: User[]) => {
    if (!checkChatRooms || !currentUserId) {
      return usersList;
    }

    try {
      const chatRoomsRef = collection(db, 'chatRooms');
      const q = query(
        chatRoomsRef,
        where('participants', 'array-contains', currentUserId)
      );
      
      const querySnapshot = await getDocs(q);
      const chatRoomParticipants = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const room = doc.data();
        room.participants.forEach((participantId: string) => {
          if (participantId !== currentUserId) {
            chatRoomParticipants.add(participantId);
          }
        });
      });

      return usersList.map(user => ({
        ...user,
        hasChatRoom: chatRoomParticipants.has(user.uid),
      }));
    } catch (err) {
      console.error('Error checking chat rooms:', err);
      return usersList;
    }
  }, [checkChatRooms, currentUserId]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef);
      
      // Exclude current user if specified
      if (excludeUid) {
        q = query(usersRef, where('uid', '!=', excludeUid));
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ ...doc.data() } as User);
      });
      
      const usersWithChatRoomInfo = await checkExistingChatRooms(fetchedUsers);
      setUsers(usersWithChatRoomInfo);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [excludeUid, checkExistingChatRooms]);

  // Real-time listener
  useEffect(() => {
    if (!enableRealtime) {
      fetchUsers();
      return;
    }

    setLoading(true);
    const usersRef = collection(db, 'users');
    let q = query(usersRef);
    
    if (excludeUid) {
      q = query(usersRef, where('uid', '!=', excludeUid));
    }

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({ ...doc.data() } as User);
        });
        const usersWithChatRoomInfo = await checkExistingChatRooms(fetchedUsers);
        setUsers(usersWithChatRoomInfo);
        setLoading(false);
      },
      (err) => {
        console.error('Error in realtime listener:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [excludeUid, enableRealtime, fetchUsers, checkExistingChatRooms]);

  // Filtered users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return users.filter(user => {
      return searchFields.some(field => {
        const value = user[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [users, searchQuery, searchFields]);

  // Select a user
  const selectUser = useCallback((user: User | null) => {
    setSelectedUser(user);
  }, []);

  // Toggle user selection
  const toggleUserSelection = useCallback((user: User) => {
    setSelectedUser(prev => 
      prev?.uid === user.uid ? null : user
    );
  }, []);

  // Check if a user is selected
  const isUserSelected = useCallback((uid: string) => {
    return selectedUser?.uid === uid;
  }, [selectedUser]);

  // Force refetch users (for non-realtime mode)
  const refetch = useCallback(() => {
    if (!enableRealtime) {
      fetchUsers();
    }
  }, [fetchUsers, enableRealtime]);

  return { 
    users: filteredUsers,
    allUsers: users,
    loading, 
    error,
    refetch,
    selectedUser,
    selectUser,
    toggleUserSelection,
    isUserSelected,
  };
};