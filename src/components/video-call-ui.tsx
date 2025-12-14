import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2 } from 'lucide-react';

// Import types from your types file
type CallType = 'video' | 'audio';
type CallStatus = 
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'declined'
  | 'ended'
  | 'missed'
  | 'busy';

interface CallState {
  isInCall: boolean;
  callId: string | null;
  callType: CallType | null;
  status: CallStatus;
  isCaller: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  otherUser: {
    uid: string;
    displayName: string;
    userImg?: string;
  } | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

// ============================================
// 1. VIDEO DISPLAY COMPONENT
// ============================================

interface VideoDisplayProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}

export const VideoDisplay: React.FC<VideoDisplayProps> = ({
  stream,
  muted = false,
  mirrored = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
};

// ============================================
// 2. INCOMING CALL MODAL
// ============================================

interface IncomingCallProps {
  callerName: string;
  callerImage?: string;
  callType: CallType;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallProps> = ({
  callerName,
  callerImage,
  callType,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-700 animate-scale-in">
        {/* Pulsing ring animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-blue-500/20 animate-ping" />
          </div>
          <div className="relative flex items-center justify-center">
            <img
              src={callerImage || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
              alt={callerName}
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-2xl"
            />
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {callerName}
          </h2>
          <div className="flex items-center justify-center gap-2 text-gray-300">
            {callType === 'video' ? (
              <Video className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            <p className="text-lg">
              Incoming {callType} call...
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <PhoneOff className="w-6 h-6" />
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-semibold transition-all transform hover:scale-105 active:scale-95 shadow-lg animate-pulse-slow"
          >
            <Phone className="w-6 h-6" />
            <span>Accept</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================
// 3. OUTGOING CALL MODAL
// ============================================

interface OutgoingCallProps {
  receiverName: string;
  receiverImage?: string;
  callType: CallType;
  onCancel: () => void;
}

export const OutgoingCallModal: React.FC<OutgoingCallProps> = ({
  receiverName,
  receiverImage,
  callType,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-700">
        <div className="text-center">
          {/* Receiver Image with animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-blue-500/20 animate-ping" />
            </div>
            <div className="relative flex items-center justify-center">
              <img
                src={receiverImage || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
                alt={receiverName}
                className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-2xl animate-pulse"
              />
            </div>
          </div>

          {/* Status */}
          <h2 className="text-3xl font-bold text-white mb-2">
            {receiverName}
          </h2>
          <div className="flex items-center justify-center gap-2 text-gray-300 mb-8">
            {callType === 'video' ? (
              <Video className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            <p className="text-lg animate-pulse">
              Calling...
            </p>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-lg"
          >
            <PhoneOff className="w-6 h-6" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 4. VIDEO CALL WINDOW
// ============================================

interface VideoCallWindowProps {
  callState: CallState;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const VideoCallWindow: React.FC<VideoCallWindowProps> = ({
  callState,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  const { 
    localStream, 
    remoteStream, 
    status, 
    isMuted, 
    isVideoOff,
    otherUser,
    callType,
  } = callState;

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Remote Video/Audio (Large) */}
      <div className="relative w-full h-full">
        {remoteStream && status === 'connected' ? (
          callType === 'video' ? (
            <VideoDisplay stream={remoteStream} className="w-full h-full" />
          ) : (
            // Audio call - show avatar
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-black">
              <div className="text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full bg-white/10 animate-ping" />
                  </div>
                  <img
                    src={otherUser?.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
                    alt={otherUser?.displayName}
                    className="relative w-40 h-40 rounded-full mx-auto border-4 border-white shadow-2xl"
                  />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {otherUser?.displayName}
                </h2>
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xl">Connected</p>
                </div>
              </div>
            </div>
          )
        ) : (
          // Connecting state
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="text-center">
              <div className="mb-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full bg-blue-500/20 animate-ping" />
                </div>
                <img
                  src={otherUser?.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
                  alt={otherUser?.displayName}
                  className="relative w-40 h-40 rounded-full mx-auto border-4 border-blue-500 shadow-2xl animate-pulse"
                />
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">
                {otherUser?.displayName}
              </h2>
              <p className="text-xl text-gray-400 animate-pulse">
                {status === 'ringing' && 'Ringing...'}
                {status === 'calling' && 'Connecting...'}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        {localStream && callType === 'video' && !isVideoOff && (
          <div className="absolute top-6 right-6 w-48 h-36 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-gray-900 transition-all hover:scale-105">
            <VideoDisplay stream={localStream} muted mirrored />
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
              <p className="text-white text-xs font-medium">You</p>
            </div>
          </div>
        )}

        {/* User Name Overlay */}
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-white font-semibold text-lg">{otherUser?.displayName}</p>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-6 right-6 p-3 bg-black/70 backdrop-blur-sm rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        {/* Call Controls (Bottom) */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-4 bg-black/80 backdrop-blur-xl px-8 py-5 rounded-3xl border border-white/20 shadow-2xl">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`p-4 rounded-full transition-all transform hover:scale-110 active:scale-95 ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="p-6 bg-red-500 hover:bg-red-600 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-lg"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>

            {/* Video Toggle Button (Only for video calls) */}
            {callType === 'video' && (
              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full transition-all transform hover:scale-110 active:scale-95 ${
                  isVideoOff
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6 text-white" />
                ) : (
                  <Video className="w-6 h-6 text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {isMuted && (
          <div className="absolute top-24 left-6 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
            <MicOff className="w-4 h-4 text-white" />
            <p className="text-white text-sm font-medium">Microphone muted</p>
          </div>
        )}
        {isVideoOff && callType === 'video' && (
          <div className="absolute top-40 left-6 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
            <VideoOff className="w-4 h-4 text-white" />
            <p className="text-white text-sm font-medium">Camera off</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// 5. CALL BUTTON COMPONENT
// ============================================

interface CallButtonProps {
  onClick: () => void;
  type: 'video' | 'audio';
  disabled?: boolean;
  className?: string;
}

export const CallButton: React.FC<CallButtonProps> = ({
  onClick,
  type,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-3 rounded-xl transition-all transform hover:scale-110 active:scale-95
        ${type === 'video' 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
        }
        text-white shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
      title={`Start ${type} call`}
    >
      {type === 'video' ? (
        <Video className="w-5 h-5" />
      ) : (
        <Phone className="w-5 h-5" />
      )}
    </button>
  );
};
