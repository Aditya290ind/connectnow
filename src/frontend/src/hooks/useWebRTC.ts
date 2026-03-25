import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalingEvent } from "../backend.d";
import { useActor } from "./useActor";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface PeerState {
  principalId: string;
  stream: MediaStream | null;
  displayName: string;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peers: Map<string, PeerState>;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  toggleHand: () => void;
  initLocal: () => Promise<void>;
  cleanup: () => void;
  sendSignal: (target: string, payload: object) => Promise<void>;
}

export function useWebRTC(roomId: string): UseWebRTCReturn {
  const { actor } = useActor();
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const processedSignals = useRef<Set<string>>(new Set());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const initLocal = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      console.warn("Media access denied:", err);
      const empty = new MediaStream();
      localStreamRef.current = empty;
      setLocalStream(empty);
      setIsVideoOff(true);
      setIsMuted(true);
    }
  }, []);

  const sendSignal = useCallback(
    async (target: string, payload: object) => {
      if (!actor) return;
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        await actor.addSignalingEvent(
          roomId,
          Principal.fromText(target),
          JSON.stringify(payload),
        );
      } catch (e) {
        console.warn("Signal send error:", e);
      }
    },
    [actor, roomId],
  );

  const createPeerConnection = useCallback(
    (peerId: string, displayName: string, isInitiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerConnsRef.current.set(peerId, pc);

      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      }

      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        const srcStream = event.streams[0];
        if (srcStream) {
          for (const track of srcStream.getTracks()) {
            remoteStream.addTrack(track);
          }
        }
        setPeers((prev) => {
          const next = new Map(prev);
          next.set(peerId, {
            principalId: peerId,
            stream: remoteStream,
            displayName,
          });
          return next;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, { type: "ice", candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          peerConnsRef.current.delete(peerId);
          setPeers((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        }
      };

      if (isInitiator) {
        pc.createOffer()
          .then((offer) =>
            pc.setLocalDescription(offer).then(() => {
              sendSignal(peerId, { type: "offer", sdp: offer });
            }),
          )
          .catch(console.warn);
      }

      setPeers((prev) => {
        const next = new Map(prev);
        if (!next.has(peerId)) {
          next.set(peerId, { principalId: peerId, stream: null, displayName });
        }
        return next;
      });

      return pc;
    },
    [sendSignal],
  );

  const handleSignalingEvent = useCallback(
    async (event: SignalingEvent) => {
      const senderId = event.sender.toString();
      const key = `${senderId}-${event.timestamp}`;
      if (processedSignals.current.has(key)) return;
      processedSignals.current.add(key);

      let payload: any;
      try {
        payload = JSON.parse(event.payload);
      } catch {
        return;
      }

      let pc = peerConnsRef.current.get(senderId);

      if (payload.type === "offer") {
        if (!pc) {
          pc = createPeerConnection(senderId, senderId.slice(0, 8), false);
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(senderId, { type: "answer", sdp: answer });
        } catch (e) {
          console.warn("Handle offer error:", e);
        }
      } else if (payload.type === "answer" && pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } catch (e) {
          console.warn("Handle answer error:", e);
        }
      } else if (payload.type === "ice" && pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.warn("Handle ICE error:", e);
        }
      }
    },
    [createPeerConnection, sendSignal],
  );

  useEffect(() => {
    if (!actor || !roomId) return;
    const interval = setInterval(async () => {
      try {
        const events = await actor.getSignalingEvents(roomId);
        for (const event of events) {
          await handleSignalingEvent(event);
        }
      } catch (e) {
        console.warn("Signaling poll error:", e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [actor, roomId, handleSignalingEvent]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const t of stream.getAudioTracks()) {
      t.enabled = !t.enabled;
    }
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const t of stream.getVideoTracks()) {
      t.enabled = !t.enabled;
    }
    setIsVideoOff((prev) => !prev);
  }, []);

  const stopScreenShare = useCallback(() => {
    const sScreen = screenStreamRef.current;
    if (sScreen) {
      for (const t of sScreen.getTracks()) {
        t.stop();
      }
    }
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsSharingScreen(false);
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      for (const pc of peerConnsRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const sStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = sStream;
      setScreenStream(sStream);
      setIsSharingScreen(true);
      const videoTrack = sStream.getVideoTracks()[0];
      if (videoTrack) {
        for (const pc of peerConnsRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
        }
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (e) {
      console.warn("Screen share error:", e);
    }
  }, [stopScreenShare]);

  const toggleHand = useCallback(() => setIsHandRaised((prev) => !prev), []);

  const cleanup = useCallback(() => {
    const local = localStreamRef.current;
    if (local) {
      for (const t of local.getTracks()) {
        t.stop();
      }
    }
    const screen = screenStreamRef.current;
    if (screen) {
      for (const t of screen.getTracks()) {
        t.stop();
      }
    }
    for (const pc of peerConnsRef.current.values()) {
      pc.close();
    }
    peerConnsRef.current.clear();
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setScreenStream(null);
    setPeers(new Map());
  }, []);

  return {
    localStream,
    screenStream,
    peers,
    isMuted,
    isVideoOff,
    isSharingScreen,
    isHandRaised,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleHand,
    initLocal,
    cleanup,
    sendSignal,
  };
}
