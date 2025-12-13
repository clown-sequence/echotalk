import { motion } from "motion/react";
import { MessageCircle, Search, Users } from "lucide-react";
import { UsersList } from "../components/users-list";
import type { UserDocument } from "../types";

interface SidebarContentProps {
  view: 'chats' | 'users';
  setView: (view: 'chats' | 'users') => void;
  totalUnread: number;
  users: UserDocument[];
  user: UserDocument;
  chatRooms: any[];
  currentUserId: string;
  selectedUserId?: string;
  onSelectUser: (user: UserDocument) => void;
  onSelectChatRoom: (roomId: string, otherUser: UserDocument) => void;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  view,
  setView,
  totalUnread,
  users,
  chatRooms,
  currentUserId,
  selectedUserId,
  onSelectUser,
  onSelectChatRoom,
  loading,
  searchQuery,
  setSearchQuery,
}) => (
  <>
    {/* User Profile */}
    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop"
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{}(You)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Online</p>
        </div>
      </div>
    </div>

    {/* View Toggle */}
    <div className="flex gap-2 p-4">
      <motion.button
        onClick={() => setView('chats')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
          view === 'chats'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <div className="flex text-xs items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Chats
          {totalUnread > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
      </motion.button>
      <motion.button
        onClick={() => setView('users')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex-1 px-4 rounded-xl font-medium transition-all ${
          view === 'users'
            ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <div className="flex text-xs items-center justify-center gap-2">
          <Users className="w-4 h-4" />
          Find Friends
        </div>
      </motion.button>
    </div>
    {/* Search Bar */}
    <div className="p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white 
            placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-300 dark:border-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>
    </div>

    {/* Users List */}
    <div className="flex-1 overflow-hidden">
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
  </>
);