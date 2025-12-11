import React, { useState } from 'react';
import type { UserDocument } from '../types';

interface UsersListProps {
  users: UserDocument[];
  onSelectUser: (user: UserDocument) => void;
  currentUserId?: string;
}

export const UsersList: React.FC<UsersListProps> = ({ 
  users, 
  onSelectUser,
  currentUserId 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDocument | null>(null);

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const handleSelectUser = (user: UserDocument) => {
    setSelectedUser(user);
    onSelectUser(user);
  };

  const isUserSelected = (uid: string) => selectedUser?.uid === uid;

  return (
    <div className="bg-white dark:bg-black transition-colors duration-500">
      <div className="w-full">
        {/* Search Input */}
        <div className="p-3 border-b-2 border-black dark:border-white">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-black text-black dark:text-white placeholder-black placeholder-opacity-50 dark:placeholder-white dark:placeholder-opacity-50 border-2 border-black dark:border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all duration-300"
          />
        </div>

        {/* Users List */}
        <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-black dark:text-white py-12 opacity-60">
              {searchQuery ? 'No users found' : 'No users available'}
            </p>
          ) : (
            filteredUsers.map((userItem) => (
              <div
                key={userItem.uid}
                onClick={() => handleSelectUser(userItem)}
                className={`
                  flex items-center p-3 cursor-pointer transition-all duration-300 border-b border-black dark:border-white border-opacity-20 dark:border-opacity-20
                  ${isUserSelected(userItem.uid)
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:bg-opacity-5 dark:hover:bg-white dark:hover:bg-opacity-5'
                  }
                `}
              >
                <img
                  src={userItem.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
                  alt={userItem.displayName || 'User'}
                  className={`
                    h-10 w-10 rounded-full object-cover mr-3 border-2 transition-all duration-300
                    ${isUserSelected(userItem.uid)
                      ? 'border-white dark:border-black'
                      : 'border-black dark:border-white'
                    }
                  `}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm transition-colors duration-300 truncate">
                    {userItem.displayName || 'No name'}
                  </h3>
                  <p className={`text-xs transition-colors duration-300 ${isUserSelected(userItem.uid) ? 'opacity-70' : 'opacity-50'}`}>
                    {userItem.email}
                  </p>
                </div>
                {isUserSelected(userItem.uid) && (
                  <span className="text-lg ml-2">✓</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};