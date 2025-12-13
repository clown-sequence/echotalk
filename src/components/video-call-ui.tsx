import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { CallState, CallStatus, CallType } from '../types';

// ============================================
// 1. VIDEO DISPLAY COMPONENT
// ============================================

interface VideoDisplayProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}

/**
 * Component to display video stream
 */
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

/**
 * Modal for incoming call notification
 */
export const IncomingCallModal: React.FC<IncomingCallProps> = ({
  callerName,
  callerImage,
  callType,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-2xl p-8 max-w-md w-full mx-4 animate-bounce-slow">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <img
              src={callerImage || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
              alt={callerName}
              className="w-24 h-24 rounded-full mx-auto border-4 border-black dark:border-white"
            />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
            {callerName}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Incoming {callType === CallType.VIDEO ? 'video' : 'audio'} call...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
            Decline
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
          >
            <Phone className="w-5 h-5" />
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================
// 3. VIDEO CALL WINDOW
// ============================================

interface VideoCallWindowProps {
  callState: CallState;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

/**
 * Main video call window with controls
 */
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

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Remote Video (Large) */}
      <div className="relative w-full h-full">
        {remoteStream && status === CallStatus.CONNECTED ? (
          <VideoDisplay stream={remoteStream} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <div className="mb-4">
                <img
                  src={otherUser?.userImg || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
                  alt={otherUser?.displayName}
                  className="w-32 h-32 rounded-full mx-auto border-4 border-white"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {otherUser?.displayName}
              </h2>
              <p className="text-gray-400">
                {status === CallStatus.RINGING && 'Ringing...'}
                {status === CallStatus.CALLING && 'Calling...'}
                {status === CallStatus.CONNECTED && 'Connected'}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (Small - Picture in Picture) */}
        {localStream && callType === CallType.VIDEO && !isVideoOff && (
          <div className="absolute top-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white shadow-2xl">
            <VideoDisplay stream={localStream} muted mirrored />
          </div>
        )}

        {/* User Name Overlay */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p className="text-white font-semibold">{otherUser?.displayName}</p>
        </div>

        {/* Call Controls (Bottom) */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`p-4 rounded-full transition-all transform hover:scale-110 ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
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
              className="p-5 bg-red-500 hover:bg-red-600 rounded-full transition-all transform hover:scale-110 shadow-lg"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>

            {/* Video Toggle Button (Only for video calls) */}
            {callType === CallType.VIDEO && (
              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full transition-all transform hover:scale-110 ${
                  isVideoOff
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-700 hover:bg-gray-600'
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
      </div>
    </div>
  );
};

// ============================================
// 4. CALL BUTTON COMPONENT
// ============================================

interface CallButtonProps {
  onClick: () => void;
  type: 'video' | 'audio';
  disabled?: boolean;
  className?: string;
}

/**
 * Button to initiate a call
 */
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
        p-3 rounded-lg border-2 border-black dark:border-white
        text-black dark:text-white
        hover:bg-black hover:text-white
        dark:hover:bg-white dark:hover:text-black
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
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

// ============================================
// 5. OUTGOING CALL MODAL
// ============================================

interface OutgoingCallProps {
  receiverName: string;
  receiverImage?: string;
  callType: CallType;
  onCancel: () => void;
}

/**
 * Modal showing outgoing call status
 */
export const OutgoingCallModal: React.FC<OutgoingCallProps> = ({
  receiverName,
  receiverImage,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Receiver Image */}
          <div className="mb-6">
            <img
              src={receiverImage || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&h=200&fit=crop'}
              alt={receiverName}
              className="w-24 h-24 rounded-full mx-auto border-4 border-black dark:border-white animate-pulse"
            />
          </div>

          {/* Status */}
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
            {receiverName}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Calling...
          </p>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto"
          >
            <PhoneOff className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 6. DEMO COMPONENT
// ============================================

export function VideoCallDemo() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          Video Call Components
        </h1>

        {/* Call Buttons */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Call Buttons
          </h2>
          <div className="flex gap-4">
            <CallButton type="video" onClick={() => console.log('Video call')} />
            <CallButton type="audio" onClick={() => console.log('Audio call')} />
          </div>
        </div>

        {/* Component Examples */}
        <div className="p-6 border-2 border-black dark:border-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            UI Components
          </h2>
          <ul className="list-disc list-inside text-black dark:text-white space-y-2">
            <li>IncomingCallModal - Shows when receiving a call</li>
            <li>OutgoingCallModal - Shows when making a call</li>
            <li>VideoCallWindow - Main call interface with controls</li>
            <li>VideoDisplay - Displays video streams</li>
            <li>CallButton - Button to initiate calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
}