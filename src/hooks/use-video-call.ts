import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ✅ IMPORT ALL TYPES FROM YOUR CENTRALIZED TYPES FILE
// ❌ DO NOT DEFINE TYPES HERE
import type {
  CallType,
  CallState,
  CallDocument,
  UseVideoCallOptions,
  UseVideoCallReturn,
} from '../types';

// ============================================
// WEBRTC CONFIGURATION
// ============================================

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export const useVideoCall = ({
  currentUserId,
  onCallReceived,
  onCallEnded,
}: UseVideoCallOptions): UseVideoCallReturn => {
  // ============================================
  // STATE
  // ============================================
  
  // Initial call state with ALL required properties including isVideoOff
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    callId: null,
    callType: null,
    status: 'idle',
    isCaller: false,
    localStream: null,
    remoteStream: null,
    otherUser: null,
    isMuted: false,
    isVideoOff: false, // ✅ This property is required
  });

  // ============================================
  // REFS
  // ============================================
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Cleanup all WebRTC resources
   */
  const cleanupCall = useCallback((): void => {
    console.log('🧹 Cleaning up call resources');

    // Stop all local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Stop all remote stream tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('🔌 Closed peer connection');
    }

    // Unsubscribe from Firestore listeners
    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }

    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }

    // Reset state
    setCallState({
      isInCall: false,
      callId: null,
      callType: null,
      status: 'idle',
      isCaller: false,
      localStream: null,
      remoteStream: null,
      otherUser: null,
      isMuted: false,
      isVideoOff: false,
    });

    // Notify parent component
    if (onCallEnded) {
      onCallEnded();
    }
  }, [onCallEnded]);

  /**
   * Setup WebRTC peer connection
   */
  const setupPeerConnection = useCallback(
    async (callId: string, localStream: MediaStream, isCaller: boolean): Promise<void> => {
      console.log('🔗 Setting up peer connection, isCaller:', isCaller);

      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log('➕ Added track to peer connection:', track.kind);
      });

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log('📥 Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        setCallState((prev) => ({
          ...prev,
          remoteStream,
          status: 'connected',
        }));
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('🧊 New ICE candidate:', event.candidate.candidate.substring(0, 50));
          try {
            const callRef = doc(db, 'calls', callId);
            const candidatesCollection = isCaller ? 'callerCandidates' : 'receiverCandidates';
            const candidatesRef = collection(callRef, candidatesCollection);
            await setDoc(doc(candidatesRef), event.candidate.toJSON());
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
          }
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
          cleanupCall();
        }
      };

      // Create offer or answer
      const callRef = doc(db, 'calls', callId);

      if (isCaller) {
        // Create and set offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('📤 Created offer');

        await updateDoc(callRef, {
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          status: 'ringing',
        });

        // Listen for answer
        unsubscribeCallRef.current = onSnapshot(callRef, (snapshot) => {
          const data = snapshot.data() as CallDocument;
          
          if (data.answer && !peerConnection.currentRemoteDescription) {
            console.log('📥 Received answer');
            const answer = new RTCSessionDescription(data.answer as RTCSessionDescriptionInit);
            peerConnection.setRemoteDescription(answer);
          }

          // Update status
          if (data.status) {
            setCallState((prev) => ({
              ...prev,
              status: data.status,
            }));
          }

          // Handle call end
          if (data.status === 'ended' || data.status === 'declined') {
            console.log('📵 Call ended by other user');
            cleanupCall();
          }
        });
      } else {
        // Get offer and create answer
        const callSnap = await getDoc(callRef);
        const callData = callSnap.data() as CallDocument;

        if (callData.offer) {
          console.log('📥 Setting remote description from offer');
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit)
          );

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('📤 Created answer');

          await updateDoc(callRef, {
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            status: 'connected',
          });
        }
      }

      // Listen for ICE candidates from the other peer
      const candidatesCollection = isCaller ? 'receiverCandidates' : 'callerCandidates';
      const candidatesRef = collection(callRef, candidatesCollection);
      unsubscribeCandidatesRef.current = onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.addIceCandidate(candidate);
            console.log('➕ Added ICE candidate from remote');
          }
        });
      });
    },
    [cleanupCall]
  );

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Start a new call
   */
  const startCall = useCallback(
    async (
      receiverId: string,
      receiverName: string,
      receiverImage: string,
      callType: CallType
    ): Promise<void> => {
      console.log('📞 Starting call to:', receiverName, 'Type:', callType);

      try {
        // Get local media stream
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callType === 'video',
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = localStream;
        console.log('🎥 Got local stream');

        // Create call document
        const callId = `call_${Date.now()}_${currentUserId}`;
        const callRef = doc(db, 'calls', callId);

        await setDoc(callRef, {
          id: callId,
          callerId: currentUserId,
          callerName: receiverName,
          callerImage: receiverImage,
          receiverId,
          receiverName: '',
          receiverImage: '',
          callType,
          status: 'calling',
          createdAt: serverTimestamp(),
        });

        console.log('✅ Created call document:', callId);

        // Update state
        setCallState({
          isInCall: true,
          callId,
          callType,
          status: 'calling',
          isCaller: true,
          localStream,
          remoteStream: null,
          otherUser: {
            uid: receiverId,
            displayName: receiverName,
            userImg: receiverImage,
          },
          isMuted: false,
          isVideoOff: false,
        });

        // Setup WebRTC
        await setupPeerConnection(callId, localStream, true);
      } catch (error) {
        console.error('❌ Error starting call:', error);
        cleanupCall();
        throw error;
      }
    },
    [currentUserId, setupPeerConnection, cleanupCall]
  );

  /**
   * Answer an incoming call
   */
  const answerCall = useCallback(
    async (callId: string): Promise<void> => {
      console.log('✅ Answering call:', callId);

      try {
        const callRef = doc(db, 'calls', callId);
        const callSnap = await getDoc(callRef);

        if (!callSnap.exists()) {
          throw new Error('Call not found');
        }

        const callData = callSnap.data() as CallDocument;

        // Get local media stream
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callData.callType === 'video',
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = localStream;
        console.log('🎥 Got local stream for answer');

        // Update call status
        await updateDoc(callRef, {
          status: 'connected',
        });

        // Update state
        setCallState({
          isInCall: true,
          callId,
          callType: callData.callType,
          status: 'connected',
          isCaller: false,
          localStream,
          remoteStream: null,
          otherUser: {
            uid: callData.callerId,
            displayName: callData.callerName,
            userImg: callData.callerImage,
          },
          isMuted: false,
          isVideoOff: false,
        });

        // Setup WebRTC
        await setupPeerConnection(callId, localStream, false);
      } catch (error) {
        console.error('❌ Error answering call:', error);
        cleanupCall();
        throw error;
      }
    },
    [setupPeerConnection, cleanupCall]
  );

  /**
   * End the current call
   */
  const endCall = useCallback(async (): Promise<void> => {
    console.log('📵 Ending call');

    try {
      if (callState.callId) {
        const callRef = doc(db, 'calls', callState.callId);
        await updateDoc(callRef, {
          status: 'ended',
        });
      }

      cleanupCall();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      cleanupCall();
    }
  }, [callState.callId, cleanupCall]);

  /**
   * Decline an incoming call
   */
  const declineCall = useCallback(
    async (callId: string): Promise<void> => {
      console.log('❌ Declining call:', callId);

      try {
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
          status: 'declined',
        });

        cleanupCall();
      } catch (error) {
        console.error('❌ Error declining call:', error);
        cleanupCall();
      }
    },
    [cleanupCall]
  );

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback((): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({
          ...prev,
          isMuted: !audioTrack.enabled,
        }));
        console.log('🎤', audioTrack.enabled ? 'Unmuted' : 'Muted');
      }
    }
  }, []);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback((): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({
          ...prev,
          isVideoOff: !videoTrack.enabled,
        }));
        console.log('📹', videoTrack.enabled ? 'Video on' : 'Video off');
      }
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Listen for incoming calls
   */
  useEffect(() => {
    if (!currentUserId) return;

    console.log('👂 Listening for incoming calls for user:', currentUserId);

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', currentUserId),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = { ...change.doc.data(), id: change.doc.id } as CallDocument;
          console.log('📞 Incoming call from:', callData.callerName);
          
          if (onCallReceived) {
            onCallReceived(callData);
          }
        }
      });
    });

    return () => {
      console.log('🔇 Stopped listening for incoming calls');
      unsubscribe();
    };
  }, [currentUserId, onCallReceived]);

  /**
   * Listen for call status changes
   */
  useEffect(() => {
    if (!callState.callId) return;

    console.log('👂 Listening for call status changes:', callState.callId);

    const callRef = doc(db, 'calls', callState.callId);
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data() as CallDocument;
      
      if (data && (data.status === 'ended' || data.status === 'declined')) {
        console.log('📵 Call status changed to:', data.status);
        cleanupCall();
      }
    });

    return () => {
      console.log('🔇 Stopped listening for call status');
      unsubscribe();
    };
  }, [callState.callId, cleanupCall]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up');
      cleanupCall();
    };
  }, [cleanupCall]);

  // ============================================
  // RETURN
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
};