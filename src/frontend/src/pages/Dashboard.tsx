import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock,
  Link,
  LogOut,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { RoomRequest } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useCreateRoom,
  usePublicRooms,
} from "../hooks/useQueries";

function generateRoomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const seg = () =>
    Array.from(
      { length: 3 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

function formatTime(ts: bigint): string {
  try {
    return new Date(Number(ts / BigInt(1_000_000))).toLocaleString();
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { identity, clear } = useInternetIdentity();
  const [joinCode, setJoinCode] = useState("");
  const { data: rooms = [], isLoading: roomsLoading } = usePublicRooms();
  const { data: profile } = useCallerProfile();
  const createRoom = useCreateRoom();

  if (!identity) {
    navigate({ to: "/" });
    return null;
  }

  const principal = identity.getPrincipal().toString();
  const displayName = profile?.displayName || `${principal.slice(0, 8)}...`;

  const handleNewMeeting = async () => {
    const seed = generateRoomCode();
    try {
      const roomId = await createRoom.mutateAsync({
        title: `${displayName}'s Meeting ${seed.slice(0, 3)}`,
        host: identity.getPrincipal(),
        isPublic: true,
      } as RoomRequest);
      const link = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Meeting created! Link copied to clipboard.");
      navigate({ to: "/room/$roomId", params: { roomId } });
    } catch {
      toast.error("Failed to create meeting.");
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (!code) {
      toast.error("Enter a meeting code.");
      return;
    }
    navigate({ to: "/room/$roomId", params: { roomId: code } });
  };

  return (
    <div className="min-h-screen bg-meet-bg text-meet-text">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel border-b border-white/10">
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          onClick={() => navigate({ to: "/" })}
          data-ocid="nav.link"
        >
          <div className="w-8 h-8 rounded-lg bg-meet-teal flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">ConnectNow</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-meet-muted">
              {principal.slice(0, 16)}...
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clear();
              navigate({ to: "/" });
            }}
            className="text-meet-muted hover:text-meet-text"
            data-ocid="nav.secondary_button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid sm:grid-cols-2 gap-4 mb-8"
        >
          <div className="glass-panel rounded-xl p-6">
            <h2 className="font-semibold text-base mb-4">Start a meeting</h2>
            <Button
              onClick={handleNewMeeting}
              disabled={createRoom.isPending}
              className="w-full bg-primary text-primary-foreground hover:opacity-90"
              data-ocid="dashboard.primary_button"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createRoom.isPending ? "Creating..." : "New Meeting"}
            </Button>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <h2 className="font-semibold text-base mb-4">Join a meeting</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Meeting code (e.g. abc-def-ghi)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="bg-secondary/50 border-white/15"
                data-ocid="dashboard.input"
              />
              <Button
                onClick={handleJoin}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
                data-ocid="dashboard.secondary_button"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Recent Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-meet-teal" />
            Public Rooms
          </h2>
          {roomsLoading ? (
            <div
              className="glass-panel rounded-xl p-8 text-center"
              data-ocid="dashboard.loading_state"
            >
              <div className="w-6 h-6 border-2 border-meet-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-meet-muted text-sm">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div
              className="glass-panel rounded-xl p-10 text-center"
              data-ocid="dashboard.empty_state"
            >
              <Video className="w-10 h-10 text-meet-muted mx-auto mb-3 opacity-50" />
              <p className="text-meet-muted">
                No active rooms. Start one above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.slice(0, 10).map((room, i) => (
                <motion.button
                  type="button"
                  key={room.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full glass-panel rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left"
                  onClick={() =>
                    navigate({
                      to: "/room/$roomId",
                      params: { roomId: room.id },
                    })
                  }
                  data-ocid={`dashboard.item.${i + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-meet-teal/20 flex items-center justify-center">
                      <Video className="w-5 h-5 text-meet-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{room.title}</p>
                      <p className="text-xs text-meet-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(room.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-meet-muted text-xs">
                      <Users className="w-3.5 h-3.5" />
                      {room.participants.length}
                    </div>
                    {room.isActive && (
                      <Badge className="bg-meet-teal/20 text-meet-teal border-meet-teal/30 text-xs">
                        Live
                      </Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-meet-muted hover:text-meet-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/room/${room.id}`;
                        navigator.clipboard
                          .writeText(link)
                          .then(() => toast.success("Link copied!"));
                      }}
                      data-ocid="dashboard.secondary_button"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="text-center py-6 text-meet-muted text-sm border-t border-white/10 mt-8">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="text-meet-teal hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
