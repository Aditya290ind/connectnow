import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RoomRequest, UserProfile } from "../backend.d";
import { useActor } from "./useActor";

export function usePublicRooms() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["publicRooms"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublicRooms();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRoomData(roomId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["roomData", roomId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRoomData(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: 5000,
  });
}

export function useRoomParticipants(roomId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["roomParticipants", roomId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRoomParticipants(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: 3000,
  });
}

export function useLatestMessages(roomId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["latestMessages", roomId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLatestMessages(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: 2000,
  });
}

export function useSignalingEvents(roomId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["signalingEvents", roomId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSignalingEvents(roomId);
    },
    enabled: !!actor && !isFetching && !!roomId,
    refetchInterval: 1500,
  });
}

export function useCreateRoom() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: RoomRequest) => {
      if (!actor) throw new Error("Not connected");
      return actor.createRoom(req);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publicRooms"] }),
  });
}

export function useJoinRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomId,
      displayName,
    }: { roomId: string; displayName: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.joinRoom(roomId, displayName);
    },
  });
}

export function useLeaveRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: any }) => {
      if (!actor) throw new Error("Not connected");
      return actor.leaveRoom(roomId, userId);
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomId,
      message,
    }: { roomId: string; message: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendMessage(roomId, message);
    },
  });
}

export function useToggleAudio() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleAudio(roomId);
    },
  });
}

export function useToggleVideo() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleVideo(roomId);
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callerProfile"] }),
  });
}

export function useKickParticipant() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ roomId, userId }: { roomId: string; userId: any }) => {
      if (!actor) throw new Error("Not connected");
      return actor.kickParticipant(roomId, userId);
    },
  });
}

export function useMuteAll() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.muteAllParticipants(roomId);
    },
  });
}

export function useLockRoom() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomId,
      locked,
    }: { roomId: string; locked: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.lockRoom(roomId, locked);
    },
  });
}

export function useAddSignalingEvent() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      roomId,
      target,
      payload,
    }: { roomId: string; target: any; payload: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addSignalingEvent(roomId, target, payload);
    },
  });
}
