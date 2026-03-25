import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ChevronDown,
  Copy,
  Crown,
  Hand,
  LayoutGrid,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MoreHorizontal,
  PenLine,
  Phone,
  Send,
  Shield,
  Smile,
  Users,
  Video,
  VideoOff,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChatMessage, Participant } from "../backend.d";
import { AudioStatus, VideoStatus } from "../backend.d";
import { BreakoutRoomsDialog } from "../components/BreakoutRoomsDialog";
import { Whiteboard } from "../components/Whiteboard";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useLatestMessages,
  useLeaveRoom,
  useLockRoom,
  useMuteAll,
  useRoomData,
  useRoomParticipants,
  useSendMessage,
} from "../hooks/useQueries";
import { useWebRTC } from "../hooks/useWebRTC";

// ── Helpers
function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

const TEAL_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.35 0.10 170), oklch(0.28 0.08 200))",
  "linear-gradient(135deg, oklch(0.35 0.10 240), oklch(0.28 0.08 270))",
  "linear-gradient(135deg, oklch(0.35 0.10 130), oklch(0.28 0.08 160))",
  "linear-gradient(135deg, oklch(0.35 0.08 300), oklch(0.28 0.06 330))",
  "linear-gradient(135deg, oklch(0.35 0.12 50), oklch(0.28 0.10 80))",
];

const REACTIONS = ["👍", "👏", "😂", "❤️", "🎉", "😮"];

interface FloatingReaction {
  id: string;
  emoji: string;
}

// ── VideoTile
interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isActive?: boolean;
  isHost?: boolean;
  isHandRaised?: boolean;
  index?: number;
  blurAmount?: number;
  reactions?: FloatingReaction[];
}

function VideoTile({
  stream,
  name,
  isLocal,
  isMuted,
  isVideoOff,
  isActive,
  isHost,
  isHandRaised,
  index = 0,
  blurAmount = 0,
  reactions = [],
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  const hasVideo =
    stream
      ?.getVideoTracks()
      .some((t) => t.enabled && t.readyState === "live") && !isVideoOff;

  return (
    <div
      className={`relative rounded-xl overflow-hidden aspect-video ${
        isActive ? "animate-pulse-teal" : ""
      }`}
      style={{ background: "oklch(0.24 0.012 240)" }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={blurAmount > 0 ? { filter: `blur(${blurAmount}px)` } : {}}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: TEAL_GRADIENTS[index % TEAL_GRADIENTS.length] }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-xl font-semibold">
              {getInitials(name)}
            </span>
          </div>
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5"
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-medium truncate max-w-[100px]">
            {name}
            {isLocal ? " (You)" : ""}
          </span>
          {isHost && <Crown className="w-3 h-3 text-yellow-400" />}
        </div>
        <div className="flex items-center gap-1">
          {isHandRaised && <span className="text-sm">✋</span>}
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-meet-teal" />
          )}
        </div>
      </div>
      {/* Floating reactions */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -80, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-2xl"
              style={{ left: "-0.75rem" }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── ChatPanel
interface ChatPanelProps {
  roomId: string;
  messages: ChatMessage[];
  disabled?: boolean;
}

function ChatPanel({ roomId, messages, disabled }: ChatPanelProps) {
  const [msg, setMsg] = useState("");
  const sendMessage = useSendMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  const handleSend = async () => {
    const text = msg.trim();
    if (!text || disabled) return;
    setMsg("");
    try {
      await sendMessage.mutateAsync({ roomId, message: text });
    } catch {
      toast.error("Failed to send message.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {disabled && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 text-center">
          Chat has been disabled by the host
        </div>
      )}
      <ScrollArea className="flex-1 px-3">
        <div ref={scrollRef} className="space-y-3 py-3">
          {messages.length === 0 ? (
            <p
              className="text-center text-meet-muted text-xs py-6"
              data-ocid="chat.empty_state"
            >
              No messages yet. Say hello! 👋
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.sender.toString()}-${m.timestamp.toString()}`}
                className="flex gap-2"
                data-ocid={`chat.item.${i + 1}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
                  style={{
                    background: TEAL_GRADIENTS[i % TEAL_GRADIENTS.length],
                  }}
                >
                  {getInitials(m.senderName || m.sender.toString().slice(0, 2))}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-meet-teal">
                    {m.senderName || m.sender.toString().slice(0, 8)}
                  </span>
                  <p className="text-xs text-meet-text mt-0.5 break-words">
                    {m.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <Input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={disabled ? "Chat disabled" : "Type a message..."}
          disabled={disabled}
          className="flex-1 bg-secondary/60 border-white/15 text-sm h-9"
          data-ocid="chat.input"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sendMessage.isPending || disabled}
          className="bg-primary text-primary-foreground h-9 w-9 p-0"
          data-ocid="chat.submit_button"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── ParticipantsPanel
interface WaitingParticipant {
  id: string;
  name: string;
}

interface ParticipantsPanelProps {
  participants: Participant[];
  currentPrincipal: string;
  onKick: (p: Participant) => void;
  isHost: boolean;
  raisedHands: Set<string>;
  onLowerHand: (id: string) => void;
  waitingParticipants: WaitingParticipant[];
  onAdmit: (id: string) => void;
  onDeny: (id: string) => void;
}

function ParticipantsPanel({
  participants,
  currentPrincipal,
  onKick,
  isHost,
  raisedHands,
  onLowerHand,
  waitingParticipants,
  onAdmit,
  onDeny,
}: ParticipantsPanelProps) {
  return (
    <ScrollArea className="h-full px-3">
      <div className="py-3 space-y-3">
        {/* Waiting room section */}
        {isHost && waitingParticipants.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Waiting to Join ({waitingParticipants.length})
            </p>
            <div className="space-y-2">
              {waitingParticipants.map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2 px-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                  data-ocid={`waiting.item.${i + 1}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-semibold text-yellow-300">
                      {getInitials(w.name)}
                    </div>
                    <span className="text-xs font-medium text-meet-text">
                      {w.name}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => onAdmit(w.id)}
                      className="h-6 px-2 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                      data-ocid={`waiting.confirm_button.${i + 1}`}
                    >
                      Admit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeny(w.id)}
                      className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                      data-ocid={`waiting.cancel_button.${i + 1}`}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-px bg-white/10 my-3" />
          </div>
        )}

        {/* Active participants */}
        {participants.length === 0 ? (
          <p
            className="text-center text-meet-muted text-xs py-6"
            data-ocid="participants.empty_state"
          >
            No participants yet.
          </p>
        ) : (
          participants.map((p, i) => (
            <div
              key={p.id.toString()}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5"
              data-ocid={`participants.item.${i + 1}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{
                    background: TEAL_GRADIENTS[i % TEAL_GRADIENTS.length],
                  }}
                >
                  {getInitials(p.displayName)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-meet-text">
                      {p.displayName}
                    </span>
                    {p.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                    {raisedHands.has(p.id.toString()) && (
                      <span className="text-sm">✋</span>
                    )}
                    {p.id.toString() === currentPrincipal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-meet-teal/50 text-meet-teal"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-meet-muted">Active</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {p.audioStatus === AudioStatus.muted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-meet-teal" />
                )}
                {p.videoStatus === VideoStatus.off ? (
                  <VideoOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-meet-teal" />
                )}
                {isHost && p.id.toString() !== currentPrincipal && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-meet-muted hover:text-white"
                        data-ocid={`participants.dropdown_menu.${i + 1}`}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="bg-card border-white/15"
                      align="end"
                    >
                      {raisedHands.has(p.id.toString()) && (
                        <DropdownMenuItem
                          onClick={() => onLowerHand(p.id.toString())}
                          className="text-meet-text text-xs"
                        >
                          ✋ Lower Hand
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onKick(p)}
                        className="text-red-400 text-xs"
                        data-ocid={`participants.delete_button.${i + 1}`}
                      >
                        <X className="w-3 h-3 mr-1" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

// ── Host Controls Panel
interface HostControlsPanelProps {
  onMuteAll: () => void;
  onStopAllVideo: () => void;
  chatDisabled: boolean;
  onToggleChat: () => void;
  waitingRoomEnabled: boolean;
  onToggleWaitingRoom: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onLowerAllHands: () => void;
  onBreakoutRooms: () => void;
}

function HostControlsPanel({
  onMuteAll,
  onStopAllVideo,
  chatDisabled,
  onToggleChat,
  waitingRoomEnabled,
  onToggleWaitingRoom,
  isLocked,
  onToggleLock,
  onLowerAllHands,
  onBreakoutRooms,
}: HostControlsPanelProps) {
  return (
    <ScrollArea className="h-full px-3">
      <div className="py-3 space-y-3">
        <p className="text-xs font-semibold text-[--meet-teal] uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Host Controls
        </p>

        {/* Toggle rows */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40">
            <div>
              <p className="text-xs font-medium text-meet-text">Waiting Room</p>
              <p className="text-[10px] text-meet-muted">
                Approve participants before joining
              </p>
            </div>
            <Switch
              checked={waitingRoomEnabled}
              onCheckedChange={onToggleWaitingRoom}
              data-ocid="hostcontrols.switch"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40">
            <div>
              <p className="text-xs font-medium text-meet-text">Lock Meeting</p>
              <p className="text-[10px] text-meet-muted">
                Prevent new participants from joining
              </p>
            </div>
            <Switch
              checked={isLocked}
              onCheckedChange={onToggleLock}
              data-ocid="hostcontrols.switch"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40">
            <div>
              <p className="text-xs font-medium text-meet-text">Disable Chat</p>
              <p className="text-[10px] text-meet-muted">
                Prevent participants from chatting
              </p>
            </div>
            <Switch
              checked={chatDisabled}
              onCheckedChange={onToggleChat}
              data-ocid="hostcontrols.switch"
            />
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-white/15 text-xs h-8"
            onClick={onMuteAll}
            data-ocid="hostcontrols.button"
          >
            <VolumeX className="w-3.5 h-3.5 mr-2" /> Mute All Participants
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-white/15 text-xs h-8"
            onClick={onStopAllVideo}
            data-ocid="hostcontrols.button"
          >
            <VideoOff className="w-3.5 h-3.5 mr-2" /> Stop All Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-white/15 text-xs h-8"
            onClick={onLowerAllHands}
            data-ocid="hostcontrols.button"
          >
            <Hand className="w-3.5 h-3.5 mr-2" /> Lower All Hands
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-white/15 text-xs h-8"
            onClick={onBreakoutRooms}
            data-ocid="hostcontrols.open_modal_button"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-2" /> Breakout Rooms
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Room Page
export default function Room() {
  const { roomId } = useParams({ from: "/room/$roomId" });
  const navigate = useNavigate();
  const { identity, login } = useInternetIdentity();
  const { actor } = useActor();

  const principal = identity?.getPrincipal().toString() ?? "";

  const { data: roomData, isLoading: roomLoading } = useRoomData(roomId);
  const { data: participants = [] } = useRoomParticipants(roomId);
  const { data: messages = [] } = useLatestMessages(roomId);
  const leaveRoom = useLeaveRoom();
  const muteAll = useMuteAll();
  const lockRoom = useLockRoom();

  const webrtc = useWebRTC(roomId);

  // Core state
  const [elapsed, setElapsed] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [nameInputOpen, setNameInputOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Premium feature state
  const [isRecording, setIsRecording] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [isLockedLocal, setIsLockedLocal] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [localBlur, setLocalBlur] = useState(0);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [localReactions, setLocalReactions] = useState<FloatingReaction[]>([]);
  const [breakoutRoomsOpen, setBreakoutRoomsOpen] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<
    { id: string; name: string }[]
  >([
    { id: "w1", name: "Alex Thompson" },
    { id: "w2", name: "Maria Garcia" },
  ]);

  const isLocked = isLockedLocal || (roomData?.isLocked ?? false);

  useEffect(() => {
    if (!identity || joined) return;
    setNameInputOpen(true);
  }, [identity, joined]);

  const handleJoinConfirm = useCallback(async () => {
    if (!actor || !identity) return;
    const name = nameInput.trim() || principal.slice(0, 8);
    setDisplayName(name);
    setNameInputOpen(false);
    try {
      await actor.joinRoom(roomId, name);
      await webrtc.initLocal();
      setJoined(true);
    } catch {
      toast.error("Failed to join room.");
    }
  }, [actor, identity, nameInput, principal, roomId, webrtc]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [joined]);

  useEffect(() => {
    return () => {
      webrtc.cleanup();
    };
  }, [webrtc]);

  const handleEndCall = async () => {
    webrtc.cleanup();
    if (identity) {
      await leaveRoom
        .mutateAsync({ roomId, userId: identity.getPrincipal() })
        .catch(() => {});
    }
    navigate({ to: "/" });
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/room/${roomId}`)
      .then(() => toast.success("Meeting link copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  const hostId = roomData?.host?.toString() ?? "";
  const isHost = principal === hostId;

  const handleReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setLocalReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setLocalReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleMuteAll = () => {
    muteAll
      .mutateAsync(roomId)
      .then(() => toast.success("All participants muted"))
      .catch(() => {});
  };

  const handleToggleLock = () => {
    const newLocked = !isLockedLocal;
    setIsLockedLocal(newLocked);
    lockRoom.mutateAsync({ roomId, locked: newLocked }).catch(() => {});
    toast.success(newLocked ? "Meeting locked" : "Meeting unlocked");
  };

  const handleLowerAllHands = () => {
    setRaisedHands(new Set());
    toast.success("All hands lowered");
  };

  const handleAdmit = (id: string) => {
    const p = waitingParticipants.find((w) => w.id === id);
    setWaitingParticipants((prev) => prev.filter((w) => w.id !== id));
    toast.success(`${p?.name ?? "Participant"} admitted`);
  };

  const handleDeny = (id: string) => {
    const p = waitingParticipants.find((w) => w.id === id);
    setWaitingParticipants((prev) => prev.filter((w) => w.id !== id));
    toast(`${p?.name ?? "Participant"} denied entry`);
  };

  const peerArray = Array.from(webrtc.peers.values());
  const allTiles = [
    {
      id: "local",
      stream: webrtc.localStream,
      name: displayName || principal.slice(0, 8),
      isLocal: true,
      isMuted: webrtc.isMuted,
      isVideoOff: webrtc.isVideoOff,
      isHost,
      isHandRaised: webrtc.isHandRaised,
      blurAmount: localBlur,
      reactions: localReactions,
    },
    ...peerArray.map((p) => {
      const participant = participants.find(
        (pp) => pp.id.toString() === p.principalId,
      );
      return {
        id: p.principalId,
        stream: p.stream,
        name: participant?.displayName || p.displayName,
        isLocal: false,
        isMuted: participant?.audioStatus === AudioStatus.muted,
        isVideoOff: participant?.videoStatus === VideoStatus.off,
        isHost: p.principalId === hostId,
        isHandRaised: raisedHands.has(p.principalId),
        blurAmount: 0,
        reactions: [],
      };
    }),
  ].slice(0, 9);

  if (!identity) {
    return (
      <div className="min-h-screen bg-meet-bg flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <Video className="w-12 h-12 text-meet-teal mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in to join</h2>
          <p className="text-meet-muted text-sm mb-6">
            You need to sign in to join this meeting.
          </p>
          <Button
            onClick={login}
            className="w-full bg-primary text-primary-foreground"
            data-ocid="room.primary_button"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (roomLoading) {
    return (
      <div
        className="min-h-screen bg-meet-bg flex items-center justify-center"
        data-ocid="room.loading_state"
      >
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-meet-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-meet-muted">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!roomLoading && roomData === null) {
    return (
      <div
        className="min-h-screen bg-meet-bg flex items-center justify-center"
        data-ocid="room.error_state"
      >
        <div className="glass-panel rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
          <p className="text-meet-muted text-sm mb-6">
            This meeting room doesn't exist or has ended.
          </p>
          <Button
            onClick={() => navigate({ to: "/" })}
            className="w-full bg-primary text-primary-foreground"
            data-ocid="room.primary_button"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const gridCols =
    allTiles.length <= 1
      ? "grid-cols-1"
      : allTiles.length <= 4
        ? "grid-cols-2"
        : "grid-cols-3";

  const waitingCount = waitingRoomEnabled ? waitingParticipants.length : 0;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.17 0.008 240), oklch(0.20 0.010 240))",
      }}
    >
      {/* Name input modal */}
      <AnimatePresence>
        {nameInputOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            data-ocid="join.dialog"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel rounded-2xl p-8 w-full max-w-sm"
            >
              <Video className="w-10 h-10 text-meet-teal mx-auto mb-4" />
              <h2 className="text-lg font-bold text-center mb-1">
                Join Meeting
              </h2>
              <p className="text-meet-muted text-sm text-center mb-6">
                {roomData?.title ?? roomId}
              </p>
              {isLocked ? (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 font-medium">
                    This meeting is locked.
                  </p>
                  <p className="text-meet-muted text-xs mt-1">
                    The host has locked this meeting.
                  </p>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Your display name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinConfirm()}
                    className="bg-secondary/60 border-white/15 mb-4"
                    data-ocid="join.input"
                  />
                  <Button
                    onClick={handleJoinConfirm}
                    className="w-full bg-primary text-primary-foreground"
                    data-ocid="join.confirm_button"
                  >
                    Join Now
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breakout Rooms Dialog */}
      <BreakoutRoomsDialog
        open={breakoutRoomsOpen}
        onOpenChange={setBreakoutRoomsOpen}
        participants={participants.map((p) => ({
          id: p.id.toString(),
          name: p.displayName,
        }))}
      />

      {/* Top Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 glass-panel border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-meet-muted hover:text-meet-text p-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-meet-text truncate max-w-[180px]">
              {roomData?.title ?? roomId}
            </span>
            {isLocked && <Lock className="w-3.5 h-3.5 text-red-400" />}
            <ChevronDown className="w-3.5 h-3.5 text-meet-muted" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-meet-muted">
            {formatDuration(elapsed)}
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-semibold uppercase tracking-wide">
                REC
              </span>
            </div>
          )}
          {isLocked && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              <Lock className="w-3 h-3 text-red-400" />
              <span className="text-red-400 text-xs">Locked</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLink}
            className="text-meet-muted hover:text-meet-text"
            data-ocid="room.secondary_button"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-meet-muted">
            <Users className="w-3.5 h-3.5" />
            {participants.length || 1}
            {waitingCount > 0 && (
              <Badge className="ml-1 text-[10px] px-1 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                +{waitingCount}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Lock banner */}
      {isLocked && joined && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 px-4 bg-red-500/10 border-b border-red-500/20">
          <Lock className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400 font-medium">
            Meeting is locked — new participants cannot join
          </span>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Video Grid */}
        <main className="flex-1 p-3 overflow-hidden flex items-center relative">
          <div className={`w-full h-full grid gap-2 ${gridCols}`}>
            {allTiles.map((tile, i) => (
              <VideoTile
                key={tile.id}
                stream={tile.stream}
                name={tile.name}
                isLocal={tile.isLocal}
                isMuted={tile.isMuted}
                isVideoOff={tile.isVideoOff}
                isActive={i === 0}
                isHost={tile.isHost}
                isHandRaised={tile.isHandRaised}
                index={i}
                blurAmount={tile.blurAmount}
                reactions={tile.reactions}
              />
            ))}
          </div>

          {/* Whiteboard Overlay */}
          {whiteboardOpen && (
            <div className="absolute inset-0">
              <Whiteboard onClose={() => setWhiteboardOpen(false)} />
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 flex flex-col glass-panel border-l border-white/10 overflow-hidden"
              style={{ width: 300 }}
            >
              <Tabs defaultValue="chat" className="flex flex-col h-full">
                <div className="flex items-center justify-between px-3 pt-3 pb-0">
                  <TabsList className="bg-secondary/60">
                    <TabsTrigger
                      value="chat"
                      className="text-xs"
                      data-ocid="sidebar.tab"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger
                      value="people"
                      className="text-xs relative"
                      data-ocid="sidebar.tab"
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      People ({participants.length})
                      {waitingCount > 0 && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-yellow-500 text-[9px] font-bold text-black flex items-center justify-center">
                          {waitingCount}
                        </span>
                      )}
                    </TabsTrigger>
                    {isHost && (
                      <TabsTrigger
                        value="host"
                        className="text-xs"
                        data-ocid="sidebar.tab"
                      >
                        <Shield className="w-3.5 h-3.5 mr-1" />
                        Host
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-7 w-7 text-meet-muted"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <TabsContent
                  value="chat"
                  className="flex-1 overflow-hidden mt-0 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <ChatPanel
                    roomId={roomId}
                    messages={messages}
                    disabled={chatDisabled && !isHost}
                  />
                </TabsContent>

                <TabsContent
                  value="people"
                  className="flex-1 overflow-hidden mt-0"
                >
                  <ParticipantsPanel
                    participants={participants}
                    currentPrincipal={principal}
                    onKick={(p) => {
                      if (actor) {
                        actor
                          .kickParticipant(roomId, p.id)
                          .then(() =>
                            toast.success(`${p.displayName} removed.`),
                          )
                          .catch(() => {});
                      }
                    }}
                    isHost={isHost}
                    raisedHands={raisedHands}
                    onLowerHand={(id) => {
                      setRaisedHands((prev) => {
                        const s = new Set(prev);
                        s.delete(id);
                        return s;
                      });
                    }}
                    waitingParticipants={
                      waitingRoomEnabled ? waitingParticipants : []
                    }
                    onAdmit={handleAdmit}
                    onDeny={handleDeny}
                  />
                </TabsContent>

                {isHost && (
                  <TabsContent
                    value="host"
                    className="flex-1 overflow-hidden mt-0"
                  >
                    <HostControlsPanel
                      onMuteAll={handleMuteAll}
                      onStopAllVideo={() =>
                        toast.success("All video stopped (UI only)")
                      }
                      chatDisabled={chatDisabled}
                      onToggleChat={() => setChatDisabled((v) => !v)}
                      waitingRoomEnabled={waitingRoomEnabled}
                      onToggleWaitingRoom={() => {
                        setWaitingRoomEnabled((v) => !v);
                        toast.success(
                          waitingRoomEnabled
                            ? "Waiting room disabled"
                            : "Waiting room enabled",
                        );
                      }}
                      isLocked={isLocked}
                      onToggleLock={handleToggleLock}
                      onLowerAllHands={handleLowerAllHands}
                      onBreakoutRooms={() => setBreakoutRoomsOpen(true)}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <footer className="flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 glass-panel border-t border-white/10 flex-wrap">
        {/* Mute */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={webrtc.toggleMute}
            className={`ctrl-btn w-12 h-12 ${webrtc.isMuted ? "bg-red-500/25" : ""}`}
            aria-label={webrtc.isMuted ? "Unmute" : "Mute"}
            data-ocid="controls.toggle"
          >
            {webrtc.isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          <span className="text-[10px] text-meet-muted">
            {webrtc.isMuted ? "Unmute" : "Mute"}
          </span>
        </div>

        {/* Video */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={webrtc.toggleVideo}
            className={`ctrl-btn w-12 h-12 ${webrtc.isVideoOff ? "bg-red-500/25" : ""}`}
            aria-label={webrtc.isVideoOff ? "Start Video" : "Stop Video"}
            data-ocid="controls.toggle"
          >
            {webrtc.isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </button>
          <span className="text-[10px] text-meet-muted">
            {webrtc.isVideoOff ? "Start Video" : "Stop Video"}
          </span>
        </div>

        {/* Screen Share */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={
              webrtc.isSharingScreen
                ? webrtc.stopScreenShare
                : webrtc.startScreenShare
            }
            className={`ctrl-btn w-12 h-12 ${webrtc.isSharingScreen ? "bg-meet-teal/25" : ""}`}
            aria-label="Share Screen"
            data-ocid="controls.toggle"
          >
            {webrtc.isSharingScreen ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>
          <span className="text-[10px] text-meet-muted">Screen</span>
        </div>

        {/* Raise Hand */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={webrtc.toggleHand}
            className={`ctrl-btn w-12 h-12 ${webrtc.isHandRaised ? "bg-yellow-500/25" : ""}`}
            aria-label="Raise Hand"
            data-ocid="controls.toggle"
          >
            <Hand
              className={`w-5 h-5 ${webrtc.isHandRaised ? "text-yellow-400" : ""}`}
            />
          </button>
          <span className="text-[10px] text-meet-muted">Hand</span>
        </div>

        {/* Reactions */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                className="ctrl-btn w-12 h-12"
                aria-label="Reactions"
                data-ocid="controls.toggle"
              >
                <Smile className="w-5 h-5" />
              </button>
              <span className="text-[10px] text-meet-muted">React</span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-2 bg-card border-white/15"
            align="center"
            side="top"
            data-ocid="controls.popover"
          >
            <div className="flex gap-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1 rounded"
                  data-ocid="controls.button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Whiteboard */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => setWhiteboardOpen((v) => !v)}
            className={`ctrl-btn w-12 h-12 ${whiteboardOpen ? "bg-meet-teal/25" : ""}`}
            aria-label="Whiteboard"
            data-ocid="controls.toggle"
          >
            <PenLine
              className={`w-5 h-5 ${whiteboardOpen ? "text-meet-teal" : ""}`}
            />
          </button>
          <span className="text-[10px] text-meet-muted">Board</span>
        </div>

        {/* Virtual Background */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                className={`ctrl-btn w-12 h-12 ${localBlur > 0 ? "bg-purple-500/25" : ""}`}
                aria-label="Virtual Background"
                data-ocid="controls.toggle"
              >
                <Monitor
                  className={`w-5 h-5 ${localBlur > 0 ? "text-purple-400" : ""}`}
                />
              </button>
              <span className="text-[10px] text-meet-muted">BG</span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-52 p-3 bg-card border-white/15"
            align="center"
            side="top"
            data-ocid="controls.popover"
          >
            <p className="text-xs font-semibold text-meet-muted mb-2 uppercase tracking-wide">
              Virtual Background
            </p>
            <div className="space-y-1">
              {[
                { label: "None", value: 0 },
                { label: "Blur (light)", value: 4 },
                { label: "Blur (heavy)", value: 10 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocalBlur(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    localBlur === opt.value
                      ? "bg-[--meet-teal]/20 text-[--meet-teal]"
                      : "hover:bg-white/5 text-meet-text"
                  }`}
                  data-ocid="controls.button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Recording (host only) */}
        {isHost && (
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                setIsRecording((v) => !v);
                toast.success(
                  isRecording ? "Recording stopped" : "Recording started",
                );
              }}
              className={`ctrl-btn w-12 h-12 ${isRecording ? "bg-red-500/25" : ""}`}
              aria-label="Record"
              data-ocid="controls.toggle"
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isRecording ? "border-red-400" : "border-white/50"
                }`}
              >
                <span
                  className={`rounded-full ${
                    isRecording
                      ? "w-2.5 h-2.5 bg-red-400"
                      : "w-2.5 h-2.5 bg-white/30"
                  }`}
                />
              </span>
            </button>
            <span
              className={`text-[10px] ${isRecording ? "text-red-400" : "text-meet-muted"}`}
            >
              {isRecording ? "Stop REC" : "Record"}
            </span>
          </div>
        )}

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                className="ctrl-btn w-12 h-12"
                aria-label="More options"
                data-ocid="controls.dropdown_menu"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <span className="text-[10px] text-meet-muted">More</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="bg-card border-white/15 mb-2"
          >
            {isHost && (
              <>
                <DropdownMenuItem
                  onClick={handleMuteAll}
                  className="text-meet-text"
                  data-ocid="controls.button"
                >
                  <VolumeX className="w-4 h-4 mr-2" /> Mute All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggleLock}
                  className="text-meet-text"
                  data-ocid="controls.button"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {isLocked ? "Unlock Room" : "Lock Room"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setBreakoutRoomsOpen(true)}
                  className="text-meet-text"
                  data-ocid="controls.open_modal_button"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" /> Breakout Rooms
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
              </>
            )}
            <DropdownMenuItem
              onClick={copyLink}
              className="text-meet-text"
              data-ocid="controls.button"
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Meeting Link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-meet-text"
              data-ocid="controls.button"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* People */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ctrl-btn w-12 h-12"
            data-ocid="controls.button"
          >
            <Users className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-meet-muted">People</span>
        </div>

        {/* Chat */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ctrl-btn w-12 h-12"
            data-ocid="controls.button"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-meet-muted">Chat</span>
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* End Call */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={handleEndCall}
            className="flex items-center gap-2 px-5 h-12 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "oklch(0.57 0.20 25)" }}
            aria-label="End Call"
            data-ocid="controls.delete_button"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
            <span className="text-sm hidden sm:block">End</span>
          </button>
          <span
            className="text-[10px]"
            style={{ color: "oklch(0.57 0.20 25)" }}
          >
            End Call
          </span>
        </div>
      </footer>
    </div>
  );
}
