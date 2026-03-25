import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Participant {
    id: ParticipantId;
    displayName: string;
    joinedAt: Time;
    isHost: boolean;
    videoStatus: VideoStatus;
    audioStatus: AudioStatus;
}
export type Time = bigint;
export type ChatId = string;
export interface SignalingEvent {
    sender: Principal;
    target: Principal;
    timestamp: bigint;
    payload: string;
}
export type RoomId = string;
export type UserId = Principal;
export type ParticipantId = Principal;
export interface RoomRequest {
    title: string;
    host: Principal;
    isPublic: boolean;
}
export interface ChatMessage {
    sender: Principal;
    message: string;
    timestamp: bigint;
    senderName: string;
    chatId: ChatId;
}
export interface RoomView {
    id: RoomId;
    title: string;
    participants: Array<Participant>;
    host: ParticipantId;
    createdAt: Time;
    isActive: boolean;
    isLocked: boolean;
    isPublic: boolean;
}
export interface UserProfile {
    displayName: string;
}
export enum AudioStatus {
    unmuted = "unmuted",
    muted = "muted"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum VideoStatus {
    on = "on",
    off = "off"
}
export interface backendInterface {
    addSignalingEvent(roomId: RoomId, target: Principal, payload: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createRoom(request: RoomRequest): Promise<RoomId>;
    endRoom(roomId: RoomId): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLatestMessages(roomId: RoomId): Promise<Array<ChatMessage>>;
    getPublicRooms(): Promise<Array<RoomView>>;
    getRoomData(roomId: string): Promise<RoomView | null>;
    getRoomParticipants(roomId: RoomId): Promise<Array<Participant>>;
    getRoomsByHost(hostId: Principal): Promise<Array<RoomView>>;
    getSignalingEvents(roomId: RoomId): Promise<Array<SignalingEvent>>;
    getUserById(userId: UserId): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProfileLegacy(): Promise<string>;
    isCallerAdmin(): Promise<boolean>;
    joinRoom(roomId: RoomId, displayName: string): Promise<boolean>;
    kickParticipant(roomId: RoomId, userId: Principal): Promise<boolean>;
    leaveRoom(roomId: RoomId, userId: Principal): Promise<boolean>;
    lockRoom(roomId: RoomId, locked: boolean): Promise<boolean>;
    muteAllParticipants(roomId: RoomId): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(roomId: RoomId, message: string): Promise<boolean>;
    setUserProfile(displayName: string): Promise<boolean>;
    toggleAudio(roomId: RoomId): Promise<boolean>;
    toggleVideo(roomId: RoomId): Promise<boolean>;
}
