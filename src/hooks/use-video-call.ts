// ============================================
// hooks/use-video-call.ts
// Complete WebRTC Implementation with Proper Types
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
  DocumentSnapshot,
  type DocumentData,
  QuerySnapshot,
  type DocumentChange,
  type Unsubscribe,
  FieldValue,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum CallStatus {
  IDLE = 'idle',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  DECLINED = 'declined',
  ENDED = 'ended'
}

export interface UserDocument {
  uid: string;
  displayName: string;
  email?: string;
  userImg?: string;
  photoURL?: string;
}

interface SerializableSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

interface SerializableIceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  usernameFragment: string | null;
}

export interface CallDocument {
  id: string;
  callerId: string;
  callerName: string;
  callerImage: string;
  receiverId: string;
  receiverName: string;
  receiverImage: string;
  callType: CallType;
  status: CallStatus;
  offer?: SerializableSessionDescription;
  answer?: SerializableSessionDescription;
  createdAt: FieldValue | Timestamp;
}

interface CallDocumentData {
  callerId: string;
  callerName: string;
  callerImage: string;
  receiverId: string;
  receiverName: string;
  receiverImage: string;
  callType: CallType;
  status: CallStatus;
  offer?: SerializableSessionDescription;
  answer?: SerializableSessionDescription;
  createdAt: FieldValue;
}

export interface CallState {
  isInCall: boolean;
  callId: string | null;
  callType: CallType | null;
  status: CallStatus;
  isCaller: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  otherUser: UserDocument | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
}

interface UseVideoCallProps {
  currentUserId: string;
  onCallReceived?: (call: CallDocument) => void;
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
}

interface UseVideoCallReturn {
  callState: CallState;
  startCall: (
    receiverId: string,
    receiverName: string,
    receiverImage: string,
    callType: CallType
  ) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

type TimeoutRef = ReturnType<typeof setTimeout> | null;
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};
const CONNECTION_TIMEOUT = 5000;
const DELETION_DELAY = 2000;
const serializeSessionDescription = (
  description: RTCSessionDescriptionInit
): SerializableSessionDescription => {
  return {
    type: description.type as RTCSdpType,
    sdp: description.sdp || ''
  };
};
const serializeIceCandidate = (
  candidate: RTCIceCandidate
): SerializableIceCandidate => {
  return {
    candidate: candidate.candidate,
    sdpMLineIndex: candidate.sdpMLineIndex,
    sdpMid: candidate.sdpMid,
    usernameFragment: candidate.usernameFragment
  };
};

export const useVideoCall = ({
  currentUserId,
  onCallReceived,
  onCallEnded,
  onCallAccepted,
}: UseVideoCallProps): UseVideoCallReturn => {
  
  // ============================================
  // State Management
  // ============================================
  
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    callId: null,
    callType: null,
    status: CallStatus.IDLE,
    isCaller: false,
    isMuted: false,
    isVideoEnabled: true,
    otherUser: null,
    localStream: null,
    remoteStream: null,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callDocUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const candidatesUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const disconnectTimeoutRef = useRef<TimeoutRef>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const createMockMediaStream = useCallback((callType: CallType): MediaStream => {
    console.log('🎭 Creating mock media stream for testing...');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Animate the canvas
    let frame = 0;
    const animate = (): void => {
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Pulsing circle
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 50 + Math.sin(frame * 0.05) * 20;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Mock Video', centerX, centerY - 80);
      
      ctx.font = '20px Arial';
      ctx.fillText('Testing Mode', centerX, centerY + 80);
      
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('No camera detected - using test stream', centerX, centerY + 110);
      
      frame++;
      requestAnimationFrame(animate);
    };
    
    animate();
    
    const videoStream = callType === CallType.VIDEO 
      ? canvas.captureStream(30) 
      : new MediaStream();
    
    // Create mock audio using Web Audio API
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    
    const oscillator = audioContext.createOscillator();
    oscillatorRef.current = oscillator;
    
    const gainNode = audioContext.createGain();
    
    // Very quiet tone
    gainNode.gain.value = 0.01;
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    
    oscillator.connect(gainNode);
    const dest = audioContext.createMediaStreamDestination();
    gainNode.connect(dest);
    oscillator.start();
    
    // Combine video and audio tracks
    const tracks: MediaStreamTrack[] = [
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ];
    
    const mockStream = new MediaStream(tracks);
    console.log('✅ Created mock stream with tracks:', mockStream.getTracks().map(t => t.kind));
    return mockStream;
  }, []);

  // ============================================
  // User Media Access
  // ============================================
  
  /**
   * Get user media with fallback to mock stream
   */
  const getUserMedia = useCallback(async (callType: CallType): Promise<MediaStream> => {
    try {
      console.log(`🎥 Requesting ${callType} permissions...`);
      
      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some((d: MediaDeviceInfo) => d.kind === 'videoinput');
      const hasAudio = devices.some((d: MediaDeviceInfo) => d.kind === 'audioinput');
      
      console.log(`Devices found - Video: ${hasVideo}, Audio: ${hasAudio}`);
      
      // Use mock if no devices available
      if (!hasVideo && !hasAudio) {
        console.log('⚠️ No devices found, using mock stream');
        return createMockMediaStream(callType);
      }
      
      if (callType === CallType.VIDEO && !hasVideo) {
        console.log('⚠️ No camera found for video call, using mock stream');
        return createMockMediaStream(callType);
      }
      
      if (!hasAudio) {
        console.log('⚠️ No microphone found, using mock stream');
        return createMockMediaStream(callType);
      }
      
      // Try to get real media
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === CallType.VIDEO
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Got real user media:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      return stream;
      
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          console.log('⚠️ Permission denied, using mock stream');
          alert('Camera/microphone permission denied. Using test stream for demonstration.');
        } else if (error.name === 'NotReadableError') {
          console.log('⚠️ Device in use, using mock stream');
          alert('Camera/microphone is in use by another app. Using test stream for demonstration.');
        } else {
          console.log('⚠️ Error accessing devices, using mock stream');
        }
      }
      
      return createMockMediaStream(callType);
    }
  }, [createMockMediaStream]);

  const cleanup = useCallback((): void => {
    console.log('🧹 Cleaning up call resources...');

    // Stop all tracks in local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach((track: MediaStreamTrack): void => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
    }
    
    // Stop audio context
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      } catch (e) {
        console.error(e);
      }
    }
    
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('Closed peer connection');
    }

    // Unsubscribe from Firestore listeners
    if (callDocUnsubscribeRef.current) {
      callDocUnsubscribeRef.current();
      callDocUnsubscribeRef.current = null;
    }

    if (candidatesUnsubscribeRef.current) {
      candidatesUnsubscribeRef.current();
      candidatesUnsubscribeRef.current = null;
    }

    // Clear disconnect timeout
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }

    // Reset state
    setCallState({
      isInCall: false,
      callId: null,
      callType: null,
      status: CallStatus.IDLE,
      isCaller: false,
      isMuted: false,
      isVideoEnabled: true,
      otherUser: null,
      localStream: null,
      remoteStream: null,
      error: null,
    });

    console.log('✅ Cleanup complete');
  }, [callState.localStream]);
  const createPeerConnection = useCallback((
    callId: string, 
    isCaller: boolean
  ): RTCPeerConnection => {
    console.log(`🔗 Creating peer connection (caller: ${isCaller})`);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = async (event: RTCPeerConnectionIceEvent): Promise<void> => {
      if (event.candidate) {
        console.log('🧊 New ICE candidate:', event.candidate.type);
        try {
          const candidatesCollection = isCaller ? 'callerCandidates' : 'calleeCandidates';
          const serializedCandidate = serializeIceCandidate(event.candidate);
          await setDoc(
            doc(db, 'calls', callId, candidatesCollection, Date.now().toString()),
            serializedCandidate
          );
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = (): void => {
      console.log('📡 Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setCallState((prev: CallState) => ({ ...prev, status: CallStatus.CONNECTED }));
        if (onCallAccepted) onCallAccepted();
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        console.log('Connection lost, ending call...');
        void endCall();
      }
    };

    // Handle remote stream
    pc.ontrack = (event: RTCTrackEvent): void => {
      console.log('📹 Received remote track:', event.track.kind);
      const [remoteStream] = event.streams;
      setCallState((prev: CallState) => ({ ...prev, remoteStream }));
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = (): void => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'disconnected') {
        disconnectTimeoutRef.current = setTimeout((): void => {
          console.log('Connection timeout, ending call...');
          void endCall();
        }, CONNECTION_TIMEOUT);
      } else if (pc.iceConnectionState === 'connected') {
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      }
    };

    return pc;
  }, [onCallAccepted]);
  const startCall = useCallback(async (
    receiverId: string,
    receiverName: string,
    receiverImage: string,
    callType: CallType
  ): Promise<void> => {
    try {
      console.log(`📞 Starting ${callType} call to ${receiverName}`);

      // Get local media stream
      const localStream = await getUserMedia(callType);
      
      // Create call document
      const callId = `${currentUserId}_${receiverId}_${Date.now()}`;
      const callDocRef = doc(db, 'calls', callId);

      // Get current user info
      const userDocSnapshot: DocumentSnapshot<DocumentData> = await getDoc(
        doc(db, 'users', currentUserId)
      );
      const currentUserData = userDocSnapshot.data() as UserDocument | undefined;

      const callData: CallDocumentData = {
        callerId: currentUserId,
        callerName: currentUserData?.displayName || 'Unknown',
        callerImage: currentUserData?.userImg || currentUserData?.photoURL || '',
        receiverId,
        receiverName,
        receiverImage,
        callType,
        status: CallStatus.RINGING,
        createdAt: serverTimestamp(),
      };

      await setDoc(callDocRef, callData);

      // Update state
      setCallState({
        isInCall: true,
        callId,
        callType,
        status: CallStatus.RINGING,
        isCaller: true,
        isMuted: false,
        isVideoEnabled: callType === CallType.VIDEO,
        otherUser: {
          uid: receiverId,
          displayName: receiverName,
          userImg: receiverImage,
        },
        localStream,
        remoteStream: null,
        error: null,
      });

      // Create peer connection
      const pc = createPeerConnection(callId, true);
      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      localStream.getTracks().forEach((track: MediaStreamTrack): void => {
        pc.addTrack(track, localStream);
        console.log(`Added ${track.kind} track to peer connection`);
      });

      // Create and set offer
      const offer: RTCSessionDescriptionInit = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const serializedOffer = serializeSessionDescription(offer);
      await updateDoc(callDocRef, { offer: serializedOffer });
      console.log('✅ Offer created and sent');

      // Listen for answer and status changes
      callDocUnsubscribeRef.current = onSnapshot(
        callDocRef, 
        async (snapshot: DocumentSnapshot<DocumentData>): Promise<void> => {
          const data = snapshot.data();
          if (!data) return;

          // Handle answer
          if (data.answer && !pc.currentRemoteDescription) {
            console.log('📩 Received answer');
            const answer = new RTCSessionDescription(
              data.answer as RTCSessionDescriptionInit
            );
            await pc.setRemoteDescription(answer);
          }

          if (data.status === CallStatus.DECLINED || data.status === CallStatus.ENDED) {
            console.log('📵 Call declined or ended');
            await endCall();
          }
        }
      );

      const calleeCandidatesQuery = collection(db, 'calls', callId, 'calleeCandidates');
      candidatesUnsubscribeRef.current = onSnapshot(
        calleeCandidatesQuery, 
        (snapshot: QuerySnapshot<DocumentData>): void => {
          snapshot.docChanges().forEach(async (change: DocumentChange<DocumentData>): Promise<void> => {
            if (change.type === 'added') {
              const candidateData = change.doc.data() as SerializableIceCandidate;
              const candidate = new RTCIceCandidate(candidateData);
              await pc.addIceCandidate(candidate);
              console.log('🧊 Added callee ICE candidate');
            }
          });
        }
      );

    } catch (error) {
      console.error('❌ Error starting call:', error);
      cleanup();
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call';
      setCallState((prev: CallState) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [currentUserId, getUserMedia, createPeerConnection, cleanup]);
  const answerCall = useCallback(async (callId: string): Promise<void> => {
    try {
      console.log(`📞 Answering call: ${callId}`);

      const callDocRef = doc(db, 'calls', callId);
      const callDocSnapshot: DocumentSnapshot<DocumentData> = await getDoc(callDocRef);
      
      if (!callDocSnapshot.exists()) {
        throw new Error('Call not found');
      }

      const callData = { 
        id: callDocSnapshot.id, 
        ...callDocSnapshot.data() 
      } as CallDocument;
      
      // Get local media stream
      const localStream = await getUserMedia(callData.callType);

      // Update state
      setCallState({
        isInCall: true,
        callId,
        callType: callData.callType,
        status: CallStatus.CONNECTED,
        isCaller: false,
        isMuted: false,
        isVideoEnabled: callData.callType === CallType.VIDEO,
        otherUser: {
          uid: callData.callerId,
          displayName: callData.callerName,
          userImg: callData.callerImage,
        },
        localStream,
        remoteStream: null,
        error: null,
      });

      // Create peer connection
      const pc = createPeerConnection(callId, false);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      localStream.getTracks().forEach((track: MediaStreamTrack): void => {
        pc.addTrack(track, localStream);
        console.log(`Added ${track.kind} track to peer connection`);
      });

      // Set remote description (offer)
      if (callData.offer) {
        const offer = new RTCSessionDescription(
          callData.offer as RTCSessionDescriptionInit
        );
        await pc.setRemoteDescription(offer);
        console.log('✅ Set remote description (offer)');
      }

      // Create and set answer
      const answer: RTCSessionDescriptionInit = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const serializedAnswer = serializeSessionDescription(answer);
      await updateDoc(callDocRef, {
        answer: serializedAnswer,
        status: CallStatus.CONNECTED,
      });
      console.log('✅ Answer created and sent');

      // Listen for caller ICE candidates
      const callerCandidatesQuery = collection(db, 'calls', callId, 'callerCandidates');
      candidatesUnsubscribeRef.current = onSnapshot(
        callerCandidatesQuery, 
        (snapshot: QuerySnapshot<DocumentData>): void => {
          snapshot.docChanges().forEach(async (change: DocumentChange<DocumentData>): Promise<void> => {
            if (change.type === 'added') {
              const candidateData = change.doc.data() as SerializableIceCandidate;
              const candidate = new RTCIceCandidate(candidateData);
              await pc.addIceCandidate(candidate);
              console.log('🧊 Added caller ICE candidate');
            }
          });
        }
      );

      // Listen for call status changes
      callDocUnsubscribeRef.current = onSnapshot(
        callDocRef, 
        (snapshot: DocumentSnapshot<DocumentData>): void => {
          const data = snapshot.data();
          if (!data) return;

          if (data.status === CallStatus.ENDED) {
            console.log('📵 Call ended by caller');
            void endCall();
          }
        }
      );

    } catch (error) {
      console.error('❌ Error answering call:', error);
      cleanup();
      const errorMessage = error instanceof Error ? error.message : 'Failed to answer call';
      setCallState((prev: CallState) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [getUserMedia, createPeerConnection, cleanup]);

  const endCall = useCallback(async (): Promise<void> => {
    try {
      console.log('📵 Ending call...');

      if (callState.callId) {
        const callDocRef = doc(db, 'calls', callState.callId);
        try {
          await updateDoc(callDocRef, { status: CallStatus.ENDED });
        } catch (error) {
          console.log('Call document may already be deleted', error);
        }
        
        // Delete call document after a delay
        setTimeout(async (): Promise<void> => {
          try {
            await deleteDoc(callDocRef);
            console.log('🗑️ Deleted call document');
          } catch (error) {
            console.error('Error deleting call document:', error);
          }
        }, DELETION_DELAY);
      }

      cleanup();
      if (onCallEnded) onCallEnded();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      cleanup();
    }
  }, [callState.callId, cleanup, onCallEnded]);

  // ============================================
  // Decline Call
  // ============================================
  
  /**
   * Decline an incoming call
   */
  const declineCall = useCallback(async (callId: string): Promise<void> => {
    try {
      console.log('📵 Declining call...');
      const callDocRef = doc(db, 'calls', callId);
      await updateDoc(callDocRef, { status: CallStatus.DECLINED });
      
      setTimeout(async (): Promise<void> => {
        try {
          await deleteDoc(callDocRef);
        } catch (error) {
          console.error('Error deleting call document:', error);
        }
      }, DELETION_DELAY);
    } catch (error) {
      console.error('❌ Error declining call:', error);
    }
  }, []);

  // ============================================
  // Toggle Controls
  // ============================================
  
  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback((): void => {
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev: CallState) => ({ ...prev, isMuted: !audioTrack.enabled }));
        console.log(`🔇 Audio ${audioTrack.enabled ? 'unmuted' : 'muted'}`);
      }
    }
  }, [callState.localStream]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback((): void => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev: CallState) => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, [callState.localStream]);

  // ============================================
  // Effect: Listen for Incoming Calls
  // ============================================
  useEffect(() => {
    if (!currentUserId) return;
  
    console.log('👂 Listening for incoming calls...');
  
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUserId),
      where('status', '==', CallStatus.RINGING)
    );
  
    const unsubscribe = onSnapshot(
      callsQuery, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
          if (change.type === 'added') {
            const callData = { 
              id: change.doc.id, 
              ...change.doc.data() 
            } as CallDocument;
            console.log('📞 Incoming call from:', callData.callerName);
            if (onCallReceived) onCallReceived(callData);
          }
        });
      }
    );
  
    return () => {
      console.log('🔇 Stopped listening for incoming calls');
      unsubscribe();
    };
  }, [currentUserId, onCallReceived]);
  
  // ============================================
  // Effect: Cleanup on Unmount
  // ============================================
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  // ============================================
  // Return Hook API
  // ============================================
  
  return {
    callState,
    startCall,
    answerCall,
    endCall,
    declineCall,
    toggleMute,
    toggleVideo,
  };
}