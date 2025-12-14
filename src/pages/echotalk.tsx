import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Menu, MessageCircle, Video, Phone, TestTube, Settings, Bell } from 'lucide-react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { useAuth } from '../contexts/auth-contexts';
import { useUsers } from '../hooks/use-users';
import { useChatRooms } from '../hooks/use-chat-rooms';
import { useMessages } from '../hooks/use-message';
import { usePresence } from '../hooks/use-presence';
import { useVideoCall } from '../hooks/use-video-call';
import { MessagesList } from '../components/messages-list';
import { MessageInput } from '../components/message-input';
import { PresenceIndicator } from '../components/presence-indicator';
import { DeviceTest } from '../components/device-test';
import {
  IncomingCallModal,
  OutgoingCallModal,
  VideoCallWindow,
} from '../components/video-call-ui';
import { 
  type CallDocument,  
  type UserDocument, 
  type MessageDocument, 
  type ChatRoomDocument,
  CALL_STATUS, 
  CALL_TYPE 
} from '../types';
import { usersToUserDocuments } from '../lib/utils';
import { SidebarContent } from './sidebar-content';
import type { Timestamp } from 'firebase/firestore';

export const EchoTalk: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'chats' | 'users'>('chats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeChatRoom, setActiveChatRoom] = useState<string | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<UserDocument | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [showDeviceTest, setShowDeviceTest] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Video call state
  const [incomingCall, setIncomingCall] = useState<CallDocument | null>(null);

  // Initialize presence tracking
  usePresence({ 
    userId: user?.uid,
    enabled: !!user?.uid 
  });

  // Initialize video call hook
  const {
    callState,
    startCall,
    answerCall,
    endCall,
    declineCall,
    toggleMute,
    toggleVideo,
  } = useVideoCall({
    currentUserId: user?.uid || '',
    onCallReceived: (call: CallDocument) => {
      console.log('📞 Incoming call received:', call);
      setIncomingCall(call);
    },
    onCallEnded: () => {
      console.log('📵 Call ended');
      setIncomingCall(null);
    },
  });

  // Get users from hook
  const { users: rawUsers } = useUsers({
    excludeUid: user?.uid,
    enableRealtime: true,
    checkChatRooms: true,
    currentUserId: user?.uid,
  });

  // Convert to UserDocument[]
  const users = useMemo<UserDocument[]>(() => {
    const firebaseUsers = rawUsers as unknown as FirebaseAuthUser[];
    return usersToUserDocuments(firebaseUsers);
  }, [rawUsers]);

  const { chatRooms, getOrCreateChatRoom, loading: chatRoomsLoading } = useChatRooms({
    currentUserId: user?.uid || '',
    enableRealtime: true,
  });

  const { 
    messages, 
    sendMessage, 
    loading: messagesLoading 
  } = useMessages({
    chatRoomId: activeChatRoom,
    currentUserId: user?.uid || '',
  });

  // Convert messages to MessageDocument format
  const convertedMessages = useMemo<MessageDocument[]>(() => {
    if (!messages || !Array.isArray(messages)) return [];
    
    return messages.map((msg): MessageDocument => {
      // Handle timestamp field that might be named differently
      const timestamp = (msg as MessageDocument & { timestamp?: Timestamp }).timestamp || msg.createdAt;
      
      return {
        id: msg.id || '',
        senderId: msg.senderId || '',
        text: typeof msg.text === 'string' ? msg.text : String(msg.text || ''),
        createdAt: timestamp,
        chatRoomId: msg.chatRoomId || '',
        read: (msg as MessageDocument & { read?: boolean }).read || false,
      } as MessageDocument;
    });
  }, [messages]);

  const totalUnread = useMemo<number>(() => {
    return chatRooms.reduce((acc: number, room: ChatRoomDocument) => {
      return acc + (room.unreadCount?.[user?.uid || ''] || 0);
    }, 0);
  }, [chatRooms, user?.uid]);

  // Chat handlers
  const handleSelectUser = async (selectedUser: UserDocument): Promise<void> => {
    setSelectedChatUser(selectedUser);
    const existingRoom = chatRooms.find((room: ChatRoomDocument) => 
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

  const handleStartChat = async (): Promise<void> => {
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

  const handleSelectChatRoom = (roomId: string, otherUser: UserDocument): void => {
    setActiveChatRoom(roomId);
    setSelectedChatUser(otherUser);
    setIsMobileMenuOpen(false);
  };

  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!text.trim() || !activeChatRoom || !user?.uid) {
      return false;
    }
    setSending(true);
    try {
      await sendMessage(text.trim());
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Video call handlers
  const handleStartVideoCall = async (): Promise<void> => {
    if (!selectedChatUser) return;
    
    try {
      await startCall(
        selectedChatUser.uid,
        selectedChatUser.displayName,
        selectedChatUser.userImg || '',
        CALL_TYPE.VIDEO
      );
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  };

  const handleStartAudioCall = async (): Promise<void> => {
    if (!selectedChatUser) return;
    
    try {
      await startCall(
        selectedChatUser.uid,
        selectedChatUser.displayName,
        selectedChatUser.userImg || '',
        CALL_TYPE.AUDIO
      );
    } catch (error) {
      console.error('Error starting audio call:', error);
    }
  };

  const handleAnswerCall = async (): Promise<void> => {
    if (!incomingCall) return;
    
    try {
      await answerCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleDeclineCall = async (): Promise<void> => {
    if (!incomingCall) return;
    
    try {
      await declineCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const handleEndCall = async (): Promise<void> => {
    try {
      await endCall();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Filter chat rooms and users based on search
  const filteredChatRooms = useMemo<ChatRoomDocument[]>(() => {
    if (!searchQuery) return chatRooms;
    return chatRooms.filter((room: ChatRoomDocument) => {
      const otherUserId = room.participants.find((p: string) => p !== user?.uid);
      const otherUser = users.find((u: UserDocument) => u.uid === otherUserId);
      return otherUser?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chatRooms, users, searchQuery, user?.uid]);

  const filteredUsers = useMemo<UserDocument[]>(() => {
    if (!searchQuery) return users;
    return users.filter((u: UserDocument) => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-black transition-colors duration-500">
      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && !callState.isInCall && (
          <IncomingCallModal
            callerName={incomingCall.callerName}
            callerImage={incomingCall.callerImage}
            callType={incomingCall.callType}
            onAccept={handleAnswerCall}
            onDecline={handleDeclineCall}
          />
        )}
      </AnimatePresence>

      {/* Outgoing Call Modal */}
      <AnimatePresence>
        {callState.isInCall && 
         callState.status === CALL_STATUS.RINGING && 
         callState.isCaller && (
          <OutgoingCallModal
            receiverName={callState.otherUser?.displayName || 'Unknown'}
            receiverImage={callState.otherUser?.userImg}
            callType={callState.callType!}
            onCancel={handleEndCall}
          />
        )}
      </AnimatePresence>

      {/* Video Call Window */}
      <AnimatePresence>
        {callState.isInCall && 
         callState.status === CALL_STATUS.CONNECTED && (
          <VideoCallWindow
            callState={callState}
            onEndCall={handleEndCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />
        )}
      </AnimatePresence>

      {/* Device Test Modal */}
      <AnimatePresence>
        {showDeviceTest && (
          <DeviceTest onClose={() => setShowDeviceTest(false)} />
        )}
      </AnimatePresence>

      {/* Main App UI */}
      <div className="min-h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600"
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MessageCircle className="w-6 h-6 text-white" />
                  </motion.div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Echo<span className="font-light">Talk</span>
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeviceTest(true)}
                  className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  title="Test Camera & Microphone"
                >
                  <TestTube className="w-5 h-5" />
                </button>
                <motion.button
                  onClick={logout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Mobile Sidebar */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  className="fixed inset-y-0 left-0 z-40 w-80 lg:hidden"
                >
                  {/* Full height container */}
                  <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                    {/* Mobile menu header - Fixed */}
                    <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-hidden">
                      <SidebarContent
                        view={view}
                        setView={setView}
                        user={user}
                        totalUnread={totalUnread}
                        users={filteredUsers}
                        chatRooms={filteredChatRooms}
                        currentUserId={user?.uid || ''}
                        selectedUserId={selectedChatUser?.uid}
                        onSelectUser={handleSelectUser}
                        onSelectChatRoom={handleSelectChatRoom}
                        loading={chatRoomsLoading}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex lg:w-80 lg:flex-shrink-0"
            >
              {/* Full height container with proper overflow */}
              <div className="w-full h-full">
                <SidebarContent
                  view={view}
                  setView={setView}
                  user={user}
                  totalUnread={totalUnread}
                  users={filteredUsers}
                  chatRooms={filteredChatRooms}
                  currentUserId={user?.uid || ''}
                  selectedUserId={selectedChatUser?.uid}
                  onSelectUser={handleSelectUser}
                  onSelectChatRoom={handleSelectChatRoom}
                  loading={chatRoomsLoading}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </motion.div>

            {/* Chat Area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col">
                {selectedChatUser ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={selectedChatUser.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100&fit=crop'}
                              alt={selectedChatUser.displayName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <PresenceIndicator 
                                userId={selectedChatUser.uid}
                                showText={false}
                                size="md"
                              />
                            </div>
                          </div>
                          <div>
                            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                              {selectedChatUser.displayName}
                            </h2>
                            <PresenceIndicator 
                              userId={selectedChatUser.uid}
                              showText={true}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Call Buttons */}
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={handleStartVideoCall}
                            disabled={callState.isInCall}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Start video call"
                          >
                            <Video className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            onClick={handleStartAudioCall}
                            disabled={callState.isInCall}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Start audio call"
                          >
                            <Phone className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Messages Area */}
                    {!activeChatRoom ? (
                      <div className="flex-1 flex items-center justify-center p-8">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center"
                        >
                          <motion.div
                            className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 mb-6"
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                          >
                            <MessageCircle className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Start a conversation
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            You haven't started chatting with {selectedChatUser.displayName} yet.
                            Send your first message to begin the conversation.
                          </p>
                          <motion.button
                            onClick={handleStartChat}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                          >
                            Start Chat
                          </motion.button>
                        </motion.div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 custom-scrollbar overflow-y-auto p-4">
                          {messagesLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
                                />
                                <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
                              </div>
                            </div>
                          ) : convertedMessages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No messages yet. Start the conversation!</p>
                              </div>
                            </div>
                          ) : (
                            <MessagesList 
                              loading={messagesLoading}
                              messages={convertedMessages}
                              currentUserId={user?.uid || ''}
                            />
                          )}
                        </div>
                        <MessageInput 
                          onSend={handleSendMessage}
                          disabled={!activeChatRoom || sending}
                          sending={sending}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <motion.div
                        className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 mb-6"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Users className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                      </motion.div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                        Welcome to EchoTalk
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        Select a user from the sidebar to start chatting.
                        Connect with friends, colleagues, or meet new people.
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Online users</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Unread messages</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};