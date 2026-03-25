import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutGrid, Plus, Users } from "lucide-react";
import { useState } from "react";

interface BreakoutParticipant {
  id: string;
  name: string;
}

interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
}

interface BreakoutRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: BreakoutParticipant[];
}

export function BreakoutRoomsDialog({
  open,
  onOpenChange,
  participants,
}: BreakoutRoomsDialogProps) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([
    { id: "1", name: "Room 1", participants: [] },
    { id: "2", name: "Room 2", participants: [] },
  ]);
  const [newRoomName, setNewRoomName] = useState("");

  const addRoom = () => {
    const name = newRoomName.trim() || `Room ${rooms.length + 1}`;
    setRooms((prev) => [
      ...prev,
      { id: Date.now().toString(), name, participants: [] },
    ]);
    setNewRoomName("");
  };

  const assignParticipant = (participantId: string, roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        participants:
          r.id === roomId
            ? r.participants.includes(participantId)
              ? r.participants
              : [...r.participants, participantId]
            : r.participants.filter((p) => p !== participantId),
      })),
    );
  };

  const getParticipantRoom = (pid: string) =>
    rooms.find((r) => r.participants.includes(pid))?.id ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl bg-card border-white/15"
        data-ocid="breakout.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[--meet-teal]" />
            Breakout Rooms
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Participants */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
              Assign Participants
            </p>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No participants to assign.
                  </p>
                ) : (
                  participants.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/40"
                      data-ocid={`breakout.item.${i + 1}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[--meet-teal]/20 flex items-center justify-center text-xs font-bold text-[--meet-teal]">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <Select
                        value={getParticipantRoom(p.id)}
                        onValueChange={(v) => assignParticipant(p.id, v)}
                      >
                        <SelectTrigger
                          className="w-28 h-7 text-xs bg-secondary/60 border-white/15"
                          data-ocid="breakout.select"
                        >
                          <SelectValue placeholder="Assign..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/15">
                          {rooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Rooms */}
          <div className="w-48">
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
              Rooms
            </p>
            <div className="space-y-2 mb-3">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/40"
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[--meet-teal]" />
                    <span className="text-xs font-medium">{r.name}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {r.participants.length}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                className="h-7 text-xs bg-secondary/60 border-white/15"
                onKeyDown={(e) => e.key === "Enter" && addRoom()}
                data-ocid="breakout.input"
              />
              <Button
                size="sm"
                onClick={addRoom}
                className="h-7 w-7 p-0 bg-primary"
                data-ocid="breakout.primary_button"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            Breakout rooms are visual only — no actual WebRTC split.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-white/15"
              data-ocid="breakout.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-primary"
              data-ocid="breakout.confirm_button"
            >
              Open Rooms
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
