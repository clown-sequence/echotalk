import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Users, Menu, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/auth-contexts';
import { useUsers } from '../hooks/use-users';
import { useChatRooms } from '../hooks/use-chat-rooms';
import { useMessages } from '../hooks/use-message';
import { useState } from 'react';
import { UsersList } from '../components/users-list';
import { MessagesList } from '../components/messages-list';
import { MessageInput } from '../components/message-input';
import type { UserDocument } from '../types';

export const EchoTalk: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState('chats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<UserDocument | null>(null);
  const [sending, setSending] = useState(false);

  // Fetch users with chat room checking
  const { users } = useUsers({
    excludeUid: user?.uid,
    enableRealtime: true,
    checkChatRooms: true,
    currentUserId: user?.uid,
  });

  // Fetch chat rooms
  const { chatRooms, getOrCreateChatRoom, loading: chatRoomsLoading } = useChatRooms({
    currentUserId: user?.uid || '',
    enableRealtime: true,
  });

  // **FIX 1: Remove enableRealtime if it doesn't exist in the hook options**
  // Check your useMessages hook definition to see what options it accepts
  const { 
    messages, 
    sendMessage, 
    loading: messagesLoading 
  } = useMessages({
    chatRoomId: activeChatRoom,
    currentUserId: user?.uid || '',
    // Remove enableRealtime if not supported
  });

  const totalUnread = chatRooms.reduce((acc, room) => {
    return acc + (room.unreadCount?.[user?.uid || ''] || 0);
  }, 0);

  const handleSelectUser = async (selectedUser: UserDocument) => {
    console.log('Selected User', selectedUser);
    setSelectedChatUser(selectedUser);
    
    // Check if chat room exists
    const existingRoom = chatRooms.find(room => 
      room.participants.includes(selectedUser.uid)
    );
    
    if (existingRoom) {
      setActiveChatRoom(existingRoom.id);
      setView('chats');
    } else {
      setActiveChatRoom(null);
    }
    
    setIsMobileMenuOpen(false);
  };

  const handleStartChat = async () => {
    if (!selectedChatUser || !user?.uid) return;
    
    try {
      const chatRoom = await getOrCreateChatRoom(selectedChatUser.uid);
      if (chatRoom) {
        setActiveChatRoom(chatRoom.id);
        setView('chats');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
    }
  };

  const handleSelectChatRoom = (roomId: string, otherUser: UserDocument) => {
    setActiveChatRoom(roomId);
    setSelectedChatUser(otherUser);
    setIsMobileMenuOpen(false);
  };

  // **FIX 2: Proper message send handler that works with MessageInput component**
  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!text.trim() || !activeChatRoom || !user?.uid) {
      console.log('Cannot send: missing data', { 
        text: text.trim(), 
        activeChatRoom, 
        userId: user?.uid 
      });
      return false;
    }

    setSending(true);
    try {
      console.log('Sending message:', text);
      await sendMessage(text.trim());
      console.log('Message sent successfully');
      return true; // Return true on success
    } catch (error) {
      console.error('Error sending message:', error);
      return false; // Return false on error
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #000;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fff;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ccc;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #000 transparent;
        }
        .dark .custom-scrollbar {
          scrollbar-color: #fff transparent;
        }
      `}</style>
      
      <div className="min-h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="border-b-2 sticky top-0 z-50 backdrop-blur-md bg-white/95 dark:bg-black/95 border-black dark:border-white transition-colors duration-300"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-black dark:text-white transition-colors duration-300">
                  Chat<span className="font-light opacity-70">UI</span>
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-black dark:text-white opacity-70 hidden sm:block transition-colors duration-300">
                  {user?.displayName}
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-4 h-[calc(100vh-8rem)]">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="flex flex-col h-full rounded-xl border-2 border-black dark:border-white overflow-hidden bg-white dark:bg-black transition-all duration-300">
                <div className="flex border-b-2 border-black dark:border-white">
                  <button
                    onClick={() => setView('chats')}
                    className={`
                      flex-1 px-4 py-3 text-sm font-medium transition-all duration-300 relative
                      ${
                        view === 'chats'
                          ? 'text-white dark:text-black bg-black dark:bg-white'
                          : 'text-black dark:text-white hover:opacity-70'
                      }
                    `}
                  >
                    My Chats
                    {totalUnread > 0 && (
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black border border-white dark:border-black">
                        {totalUnread}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setView('users')}
                    className={`
                      flex-1 px-4 py-3 capitalize text-sm font-medium transition-all duration-300
                      ${
                        view === 'users'
                          ? 'text-white dark:text-black bg-black dark:bg-white'
                          : 'text-black dark:text-white hover:opacity-70'
                      }
                    `}
                  >
                    find friends
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {view === 'chats' ? (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      {chatRoomsLoading ? (
                        <div className="p-4 text-black dark:text-white opacity-50">Loading...</div>
                      ) : chatRooms.length === 0 ? (
                        <div className="p-4 text-center text-black dark:text-white opacity-50">
                          No conversations yet
                        </div>
                      ) : (
                        chatRooms.map((room) => {
                          const otherUserId = room.participants.find(id => id !== user?.uid);
                          const otherUser = users.find(u => u.uid === otherUserId);
                          
                          return (
                            <div
                              key={room.id}
                              onClick={() => otherUser && handleSelectChatRoom(room.id, otherUser)}
                              className={`
                                p-3 border-b border-black dark:border-white border-opacity-20 dark:border-opacity-20 cursor-pointer transition-all duration-300
                                ${activeChatRoom === room.id
                                  ? 'bg-black dark:bg-white text-white dark:text-black'
                                  : 'bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:bg-opacity-5 dark:hover:bg-white dark:hover:bg-opacity-5'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={otherUser?.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1331&auto=format&fit=crop'}
                                  alt={otherUser?.displayName || 'User'}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-black dark:border-white"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm truncate">
                                    {otherUser?.displayName || 'Unknown User'}
                                  </h3>
                                  {room.lastMessage && (
                                    <p className="text-xs opacity-60 truncate">
                                      {room.lastMessage.text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="h-full overflow-hidden">
                        <UsersList 
                          users={users} 
                          onSelectUser={handleSelectUser}
                          currentUserId={user?.uid}
                        />
                      </div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/80 dark:bg-white/80 lg:hidden z-40 transition-colors duration-300"
                  />
                  <motion.div
                    initial={{ x: -320 }}
                    animate={{ x: 0 }}
                    exit={{ x: -320 }}
                    transition={{ type: 'tween' }}
                    className="fixed left-0 top-0 h-full w-80 z-50 lg:hidden bg-white dark:bg-black border-r-2 border-black dark:border-white transition-colors duration-300"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex border-b-2 border-black dark:border-white">
                        <button
                          onClick={() => setView('chats')}
                          className={`
                            flex-1 px-4 py-3 text-sm font-medium transition-all duration-300
                            ${
                              view === 'chats'
                                ? 'text-white dark:text-black bg-black dark:bg-white'
                                : 'text-black dark:text-white hover:opacity-70'
                            }
                          `}
                        >
                          My Chats
                          {totalUnread > 0 && (
                            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black border border-white dark:border-black">
                              {totalUnread}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setView('users')}
                          className={`
                            flex-1 px-4 py-3 text-sm font-medium transition-all duration-300
                            ${
                              view === 'users'
                                ? 'text-white dark:text-black bg-black dark:bg-white'
                                : 'text-black dark:text-white hover:opacity-70'
                            }
                          `}
                        >
                          All Users
                        </button>
                      </div>

                      <div className="flex-1 overflow-hidden">
                        {view === 'chats' ? (
                          <div className="h-full overflow-y-auto custom-scrollbar">
                            {chatRooms.map((room) => {
                              const otherUserId = room.participants.find(id => id !== user?.uid);
                              const otherUser = users.find(u => u.uid === otherUserId);
                              
                              return (
                                <div
                                  key={room.id}
                                  onClick={() => otherUser && handleSelectChatRoom(room.id, otherUser)}
                                  className={`
                                    p-3 border-b border-black dark:border-white border-opacity-20 dark:border-opacity-20 cursor-pointer transition-all duration-300
                                    ${activeChatRoom === room.id
                                      ? 'bg-black dark:bg-white text-white dark:text-black'
                                      : 'bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:bg-opacity-5 dark:hover:bg-white dark:hover:bg-opacity-5'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={otherUser?.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1331&auto=format&fit=crop'}
                                      alt={otherUser?.displayName || 'User'}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-black dark:border-white"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-sm truncate">
                                        {otherUser?.displayName || 'Unknown User'}
                                      </h3>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-full overflow-hidden">
                            <UsersList 
                              users={users} 
                              onSelectUser={handleSelectUser}
                              currentUserId={user?.uid}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col rounded-xl border-2 border-black dark:border-white overflow-hidden bg-white dark:bg-black transition-all duration-300">
              {selectedChatUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b-2 border-black dark:border-white flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedChatUser.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=1331&auto=format&fit=crop'}
                        alt={selectedChatUser.displayName || 'User'}
                        className="w-10 h-10 rounded-full object-cover border-2 border-black dark:border-white"
                      />
                      <div>
                        <h2 className="font-semibold text-lg text-black dark:text-white transition-colors duration-300">
                          {selectedChatUser.displayName || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-black dark:text-white opacity-60 transition-colors duration-300">
                          Online
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages or Start Chat */}
                  {!activeChatRoom ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-black dark:text-white transition-colors duration-300">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-4">Start a conversation</p>
                        <button
                          onClick={handleStartChat}
                          className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white rounded-lg font-medium hover:opacity-80 transition-all duration-300"
                        >
                          Start Chat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* **FIX 3: Display messages with better debugging** */}
                      <div className="flex-1 custom-scrollbar overflow-y-auto p-4">
                        {messagesLoading ? (
                          <div className="text-center text-black dark:text-white opacity-50">
                            Loading messages...
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center text-black dark:text-white opacity-50 space-y-2">
                            <p>No messages yet. Start the conversation!</p>
                            <p className="text-xs opacity-40">Room ID: {activeChatRoom}</p>
                          </div>
                        ) : (
                          <>
                            {/* Debug info - remove after testing */}
                            <div className="text-xs text-black dark:text-white opacity-30 mb-4">
                              {messages.length} message(s) • Room: {activeChatRoom}
                            </div>
                            <MessagesList 
                              loading={messagesLoading}
                              messages={messages}
                              currentUserId={user?.uid || ''}
                            />
                          </>
                        )}
                      </div>

                      {/* **FIX 4: Use MessageInput component properly** */}
                      <MessageInput 
                        onSend={handleSendMessage}
                        disabled={!activeChatRoom}
                        sending={sending}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-black dark:text-white transition-colors duration-300">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a user to start chatting</p>
                    <p className="text-sm mt-2 opacity-70">
                      Choose from "My Chats" or "Find Friends"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};