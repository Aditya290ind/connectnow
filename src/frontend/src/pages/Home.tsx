import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock,
  MessageSquare,
  Monitor,
  Shield,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { RoomRequest } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useCreateRoom } from "../hooks/useQueries";

export default function Home() {
  const navigate = useNavigate();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const [joinCode, setJoinCode] = useState("");
  const createRoom = useCreateRoom();

  const handleNewMeeting = async () => {
    if (!identity) {
      login();
      return;
    }
    try {
      const roomId = await createRoom.mutateAsync({
        title: "My Meeting",
        host: identity.getPrincipal(),
        isPublic: true,
      } as RoomRequest);
      navigate({ to: "/room/$roomId", params: { roomId } });
    } catch {
      toast.error("Failed to create meeting. Try again.");
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (!code) {
      toast.error("Please enter a meeting code.");
      return;
    }
    navigate({ to: "/room/$roomId", params: { roomId: code } });
  };

  return (
    <div className="min-h-screen bg-meet-bg text-meet-text flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 glass-panel border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-meet-teal flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-meet-text">ConnectNow</span>
        </div>
        <div className="flex gap-3 items-center">
          {identity ? (
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-meet-muted hover:text-meet-text"
            >
              Dashboard
            </Button>
          ) : (
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="bg-primary text-primary-foreground hover:opacity-90"
              data-ocid="nav.primary_button"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-meet-teal/15 border border-meet-teal/30 text-meet-teal text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-meet-teal animate-pulse" />
            No time limits. No restrictions.
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Meet without
            <span
              className="block text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, oklch(0.77 0.15 170), oklch(0.65 0.18 200))",
              }}
            >
              limits.
            </span>
          </h1>
          <p className="text-meet-muted text-xl mb-10 leading-relaxed">
            Unlimited meetings, no time limits — HD video calls for teams of any
            size, anywhere, on any device.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleNewMeeting}
              disabled={createRoom.isPending}
              size="lg"
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:opacity-90 px-8 py-3 text-base font-semibold"
              data-ocid="hero.primary_button"
            >
              <Video className="w-5 h-5 mr-2" />
              {createRoom.isPending ? "Creating..." : "New Meeting"}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Enter meeting code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="bg-card border-white/15 text-meet-text placeholder:text-meet-muted"
                data-ocid="hero.input"
              />
              <Button
                variant="outline"
                size="lg"
                onClick={handleJoin}
                className="border-white/20 text-meet-text hover:bg-white/10 whitespace-nowrap"
                data-ocid="hero.secondary_button"
              >
                Join <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl w-full"
        >
          {[
            {
              icon: Clock,
              title: "No Time Limits",
              desc: "Meet as long as you need",
            },
            {
              icon: Monitor,
              title: "Screen Sharing",
              desc: "Share your screen instantly",
            },
            {
              icon: MessageSquare,
              title: "Live Chat",
              desc: "Chat with all participants",
            },
            {
              icon: Shield,
              title: "Secure & Private",
              desc: "End-to-end encrypted calls",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-panel rounded-xl p-5 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-meet-teal/15 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-meet-teal" />
              </div>
              <h3 className="font-semibold text-sm text-meet-text mb-1">
                {title}
              </h3>
              <p className="text-meet-muted text-xs">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-meet-muted text-sm border-t border-white/10">
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
