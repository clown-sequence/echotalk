import { motion } from "framer-motion";
import { MessageCircle, Search, Users } from "lucide-react";
import { UsersList } from "../components/users-list";
import type { ChatRoomDocument, UserDocument } from "../types";
import type { User } from "firebase/auth";

// ============================================
// COMPONENT TYPES
// ============================================

/**
 * Props for SidebarContent component
 * 
 * Note: user can be:
 * - Firebase Auth User (from useAuth)
 * - UserDocument (from Firestore)
 * - null (not logged in)
 */
interface SidebarContentProps {
  view: 'chats' | 'users';
  setView: (view: 'chats' | 'users') => void;
  totalUnread: number;
  users: UserDocument[];
  user: User | UserDocument | null;
  chatRooms: ChatRoomDocument[];
  currentUserId: string;
  selectedUserId?: string;
  onSelectUser: (user: UserDocument) => void;
  onSelectChatRoom: (roomId: string, otherUser: UserDocument) => void;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display name from any user type
 */
const getDisplayName = (user: User | UserDocument | null): string => {
  if (!user) return 'Guest';
  
  if ('displayName' in user && user.displayName) {
    return user.displayName;
  }
  
  if ('email' in user && user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
};

/**
 * Get user image URL from any user type
 */
const getUserImage = (user: User | UserDocument | null): string => {
  const defaultImage = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop';
  
  if (!user) return defaultImage;
  
  if ('userImg' in user && user.userImg) {
    return user.userImg;
  }
  
  if ('photoURL' in user && user.photoURL) {
    return user.photoURL;
  }
  
  return defaultImage;
};

/**
 * Get user online status
 */
const getUserStatus = (user: User | UserDocument | null): string => {
  if (!user) return 'offline';
  if ('status' in user && user.status) {
    return user.status;
  }
  return 'online';
};

export const SidebarContent: React.FC<SidebarContentProps> = ({
  view,
  setView,
  totalUnread,
  users,
  user,
  chatRooms,
  currentUserId,
  selectedUserId,
  onSelectUser,
  onSelectChatRoom,
  loading,
  searchQuery,
  setSearchQuery,
}) => {
  // ============================================
  // DERIVED STATE
  // ============================================
  
  const displayName = getDisplayName(user);
  const userImage = getUserImage(user);
  const userStatus = getUserStatus(user);
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* User Profile - Fixed height */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={userImage}
              alt={`${displayName}'s profile`}
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
            />
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                userStatus === 'online' ? 'bg-green-500' : 
                userStatus === 'away' ? 'bg-yellow-500' : 
                'bg-gray-400'
              }`} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {displayName} <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">(You)</span>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {userStatus}
            </p>
          </div>
        </div>
      </div>

      {/* View Toggle - Fixed height */}
      <div className="flex-shrink-0 flex gap-2 p-4">
        <motion.button
          onClick={() => setView('chats')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
            view === 'chats'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Chats</span>
            {totalUnread > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </motion.button>
        <motion.button
          onClick={() => setView('users')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
            view === 'users'
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">Users</span>
          </div>
        </motion.button>
      </div>

      {/* Search Bar - Fixed height */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={view === 'chats' ? 'Search conversations...' : 'Search users...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white 
              placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-300 dark:border-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Users List - Scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <UsersList
          users={users}
          chatRooms={chatRooms}
          currentUserId={currentUserId}
          view={view}
          selectedUserId={selectedUserId}
          onSelectUser={onSelectUser}
          onSelectChatRoom={onSelectChatRoom}
          loading={loading}
        />
      </div>
    </div>
  );
};