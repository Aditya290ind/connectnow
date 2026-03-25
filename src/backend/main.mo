import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Error "mo:core/Error";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Array "mo:core/Array";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  module Room {
    public type RoomId = Text;
    public type ParticipantId = Principal;

    public type VideoStatus = {
      #on;
      #off;
    };

    public type AudioStatus = {
      #muted;
      #unmuted;
    };

    public type Participant = {
      id : ParticipantId;
      displayName : Text;
      videoStatus : VideoStatus;
      audioStatus : AudioStatus;
      joinedAt : Time.Time;
      isHost : Bool;
    };

    public type Room = {
      id : RoomId;
      title : Text;
      host : ParticipantId;
      participants : Map.Map<ParticipantId, Participant>;
      isPublic : Bool;
      createdAt : Time.Time;
      isActive : Bool;
      isLocked : Bool;
    };

    public func toView(room : Room) : RoomView {
      {
        id = room.id;
        title = room.title;
        host = room.host;
        participants = room.participants.values().toArray();
        isPublic = room.isPublic;
        createdAt = room.createdAt;
        isActive = room.isActive;
        isLocked = room.isLocked;
      };
    };
  };
  type Room = Room.Room;
  type RoomId = Room.RoomId;
  type ParticipantId = Room.ParticipantId;
  type VideoStatus = Room.VideoStatus;
  type ChatId = Text;

  type RoomView = {
    id : RoomId;
    title : Text;
    host : ParticipantId;
    participants : [Room.Participant];
    isPublic : Bool;
    createdAt : Time.Time;
    isActive : Bool;
    isLocked : Bool;
  };

  module RoomCreationRequest {
    public type RoomRequest = {
      title : Text;
      host : Principal;
      isPublic : Bool;
    };

    public module RoomRequest {
      public func compare(request1 : RoomRequest, request2 : RoomRequest) : Order.Order {
        Text.compare(request1.title, request2.title);
      };
    };
  };
  type RoomRequest = RoomCreationRequest.RoomRequest;

  let rooms = Map.empty<RoomId, Room>();

  let roomCreationRequests = List.empty<RoomRequest>();

  module User {
    public type UserId = Principal;

    public type User = {
      id : UserId;
      displayName : Text;
    };
  };
  type User = User.User;
  type UserId = User.UserId;

  public type UserProfile = {
    displayName : Text;
  };

  let users = Map.empty<UserId, UserProfile>();

  module ChatMessage {
    public type ChatMessage = {
      chatId : ChatId;
      sender : Principal;
      senderName : Text;
      message : Text;
      timestamp : Int;
    };

    public module ChatMessage {
      public func compare(msg1 : ChatMessage, msg2 : ChatMessage) : Order.Order {
        switch (Int.compare(msg1.timestamp, msg2.timestamp)) {
          case (#equal) { Text.compare(msg1.message, msg2.message) };
	        case (order) { order };
        };
      };
    };
  };
  type ChatMessage = ChatMessage.ChatMessage;

  let chatMessages = Map.empty<ChatId, List.List<ChatMessage>>();

  module SignalingEvent {
    public type SignalingEvent = {
      sender : Principal;
      target : Principal;
      payload : Text;
      timestamp : Int;
    };

    public module SignalingEvent {
      public func compare(ev1 : SignalingEvent, ev2 : SignalingEvent) : Order.Order {
        switch (Int.compare(ev1.timestamp, ev2.timestamp)) {
          case (#equal) { Text.compare(ev1.payload, ev2.payload) };
	        case (order) { order };
        };
      };
    };
  };
  type SignalingEvent = SignalingEvent.SignalingEvent;

  let signalingEvents = Map.empty<RoomId, List.List<SignalingEvent>>();

  // Helper functions
  private func isRoomHost(roomId : RoomId, userId : Principal) : Bool {
    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) { room.host == userId };
    };
  };

  private func isRoomParticipant(roomId : RoomId, userId : Principal) : Bool {
    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        switch (room.participants.get(userId)) {
          case (null) { false };
	        case (?_) { true };
        };
      };
    };
  };

  // User Profile Management (Required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    users.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    users.add(caller, profile);
  };

  // Meeting Rooms
  public shared ({ caller }) func createRoom(request : RoomRequest) : async RoomId {
    // Any authenticated user can create a room
    if (caller != request.host) {
	    Runtime.trap("Unauthorized: Can only create room as yourself");
    };

    let roomId = request.title.concat(Time.now().toText());

    let displayName = switch (users.get(caller)) {
      case (null) { "Host" };
      case (?profile) { profile.displayName };
    };

    let hostParticipant : Room.Participant = {
      id = request.host;
      displayName;
      videoStatus = #on;
      audioStatus = #unmuted;
      joinedAt = Time.now();
      isHost = true;
    };

    let participants = Map.empty<ParticipantId, Room.Participant>();
    participants.add(hostParticipant.id, hostParticipant);

    let room : Room = {
      id = roomId;
      title = request.title;
      host = request.host;
      participants;
      isPublic = request.isPublic;
      createdAt = Time.now();
      isActive = true;
      isLocked = false;
    };

    rooms.add(roomId, room);

    // Initialize chat for this room
    chatMessages.add(roomId, List.empty<ChatMessage>());

    roomId;
  };

  public shared ({ caller }) func joinRoom(roomId : RoomId, displayName : Text) : async Bool {
    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        // Check if room is locked
        if (room.isLocked and not isRoomHost(roomId, caller)) {
	        Runtime.trap("Unauthorized: Room is locked");
        };

        // Check if already a participant
        switch (room.participants.get(caller)) {
          case (?_) { true }; // Already in room
	        case (null) {
	          let participant : Room.Participant = {
	            id = caller;
	            displayName;
	            videoStatus = #on;
	            audioStatus = #unmuted;
	            joinedAt = Time.now();
	            isHost = false;
	          };
	          room.participants.add(caller, participant);
	          true;
	        };
        };
      };
    };
  };

  public shared ({ caller }) func leaveRoom(roomId : RoomId, userId : Principal) : async Bool {
    // Users can only leave themselves, or host can kick
    if (caller != userId and not isRoomHost(roomId, caller)) {
	    Runtime.trap("Unauthorized: Can only leave yourself or host can remove participants");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        // Host cannot leave their own room, must end it
        if (userId == room.host) {
	        Runtime.trap("Host cannot leave room, must end it instead");
        };
        room.participants.remove(userId);
        true;
      };
    };
  };

  public shared ({ caller }) func kickParticipant(roomId : RoomId, userId : Principal) : async Bool {
    // Only host can kick
    if (not isRoomHost(roomId, caller)) {
	    Runtime.trap("Unauthorized: Only room host can kick participants");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        if (userId == room.host) {
	        Runtime.trap("Cannot kick the host");
        };
        room.participants.remove(userId);
        true;
      };
    };
  };

  public shared ({ caller }) func endRoom(roomId : RoomId) : async Bool {
    // Only the host can end the room
    if (not isRoomHost(roomId, caller)) {
	    Runtime.trap("Unauthorized: Only room host can end the room");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        rooms.remove(roomId);
        chatMessages.remove(roomId);
        signalingEvents.remove(roomId);
        true;
      };
    };
  };

  public shared ({ caller }) func lockRoom(roomId : RoomId, locked : Bool) : async Bool {
    // Only host can lock/unlock room
    if (not isRoomHost(roomId, caller)) {
	    Runtime.trap("Unauthorized: Only room host can lock/unlock the room");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        let updatedRoom : Room = {
          id = room.id;
          title = room.title;
          host = room.host;
          participants = room.participants;
          isPublic = room.isPublic;
          createdAt = room.createdAt;
          isActive = room.isActive;
          isLocked = locked;
        };
        rooms.add(roomId, updatedRoom);
        true;
      };
    };
  };

  public query ({ caller }) func getRoomData(roomId : Text) : async ?RoomView {
    switch (rooms.get(roomId)) {
      case (null) { null };
      case (?room) {
        // Public rooms can be viewed by anyone
        // Private rooms only by participants
        if (room.isPublic or isRoomParticipant(roomId, caller)) {
          ?Room.toView(room);
        } else {
          Runtime.trap("Unauthorized: Not a participant of this private room");
        };
      };
    };
  };

  public query ({ caller }) func getPublicRooms() : async [RoomView] {
    // Anyone can view public rooms
    rooms.values().toArray().filter(func(r) { r.isPublic }).map(func(r) { Room.toView(r) });
  };

  public query ({ caller }) func getRoomParticipants(roomId : RoomId) : async [Room.Participant] {
    switch (rooms.get(roomId)) {
      case (null) { [] };
      case (?room) {
        // Only participants can see participant list
        if (not isRoomParticipant(roomId, caller)) {
	        Runtime.trap("Unauthorized: Must be a participant to view participant list");
        };
        room.participants.values().toArray();
      };
    };
  };

  public shared ({ caller }) func toggleVideo(roomId : RoomId) : async Bool {
    // Only participants can toggle their own video
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to toggle video");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        switch (room.participants.get(caller)) {
          case (null) { false };
	        case (?participant) {
	          let newVideoStatus = switch (participant.videoStatus) {
	            case (#on) { #off };
	            case (#off) { #on };
	          };
	          let updatedParticipant : Room.Participant = {
	            id = participant.id;
	            displayName = participant.displayName;
	            videoStatus = newVideoStatus;
	            audioStatus = participant.audioStatus;
	            joinedAt = participant.joinedAt;
	            isHost = participant.isHost;
	          };
	          room.participants.add(updatedParticipant.id, updatedParticipant);
	          true;
	        };
        };
      };
    };
  };

  public shared ({ caller }) func toggleAudio(roomId : RoomId) : async Bool {
    // Only participants can toggle their own audio
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to toggle audio");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        switch (room.participants.get(caller)) {
          case (null) { false };
	        case (?participant) {
	          let newAudioStatus = switch (participant.audioStatus) {
	            case (#muted) { #unmuted };
	            case (#unmuted) { #muted };
	          };
	          let updatedParticipant : Room.Participant = {
	            id = participant.id;
	            displayName = participant.displayName;
	            videoStatus = participant.videoStatus;
	            audioStatus = newAudioStatus;
	            joinedAt = participant.joinedAt;
	            isHost = participant.isHost;
	          };
	          room.participants.add(updatedParticipant.id, updatedParticipant);
	          true;
	        };
        };
      };
    };
  };

  public shared ({ caller }) func muteAllParticipants(roomId : RoomId) : async Bool {
    // Only host can mute all
    if (not isRoomHost(roomId, caller)) {
	    Runtime.trap("Unauthorized: Only room host can mute all participants");
    };

    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        for ((participantId, participant) in room.participants.entries()) {
          let updatedParticipant : Room.Participant = {
            id = participant.id;
            displayName = participant.displayName;
            videoStatus = participant.videoStatus;
            audioStatus = #muted;
            joinedAt = participant.joinedAt;
            isHost = participant.isHost;
          };
          room.participants.add(participantId, updatedParticipant);
        };
        true;
      };
    };
  };

  // Chat
  public shared ({ caller }) func sendMessage(roomId : RoomId, message : Text) : async Bool {
    // Only room participants can send messages
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to send messages");
    };

    let senderName = switch (users.get(caller)) {
      case (null) { "Anonymous" };
      case (?profile) { profile.displayName };
    };

    let chatMessage : ChatMessage = {
      chatId = roomId;
      sender = caller;
      senderName;
      message;
      timestamp = Time.now();
    };

    switch (chatMessages.get(roomId)) {
      case (null) {
        let messages = List.empty<ChatMessage>();
        messages.add(chatMessage);
        chatMessages.add(roomId, messages);
      };
      case (?messages) {
        messages.add(chatMessage);
      };
    };
    true;
  };

  public query ({ caller }) func getLatestMessages(roomId : RoomId) : async [ChatMessage] {
    // Only room participants can view messages
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to view messages");
    };

    switch (chatMessages.get(roomId)) {
      case (null) { [] };
      case (?messages) { messages.toArray().sort(ChatMessage.ChatMessage.compare) };
    };
  };

  // WebRTC Signaling
  public shared ({ caller }) func addSignalingEvent(roomId : RoomId, target : Principal, payload : Text) : async () {
    // Only room participants can send signaling events
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to send signaling events");
    };

    // Verify target is also a participant
    if (not isRoomParticipant(roomId, target)) {
	    Runtime.trap("Unauthorized: Target must be a participant");
    };

    let event : SignalingEvent = {
      sender = caller;
      target;
      payload;
      timestamp = Time.now();
    };

    switch (signalingEvents.get(roomId)) {
      case (null) {
        let events = List.empty<SignalingEvent>();
        events.add(event);
        signalingEvents.add(roomId, events);
      };
      case (?events) {
        events.add(event);
      };
    };
  };

  public query ({ caller }) func getSignalingEvents(roomId : RoomId) : async [SignalingEvent] {
    // Only room participants can retrieve signaling events
    if (not isRoomParticipant(roomId, caller)) {
	    Runtime.trap("Unauthorized: Must be a participant to retrieve signaling events");
    };

    switch (signalingEvents.get(roomId)) {
      case (null) { [] };
      case (?events) {
        // Filter events where caller is the target
        events.toArray().filter(func(e : SignalingEvent) : Bool {
          e.target == caller;
        }).sort(SignalingEvent.SignalingEvent.compare);
      };
    };
  };

  // Helpers
  public query ({ caller }) func getRoomsByHost(hostId : Principal) : async [RoomView] {
    // Users can only view their own hosted rooms, admins can view any
    if (caller != hostId and not AccessControl.isAdmin(accessControlState, caller)) {
	    Runtime.trap("Unauthorized: Can only view your own hosted rooms");
    };
    rooms.values().toArray().filter(func(r) { r.host == hostId }).map(func(r) { Room.toView(r) });
  };

  // Legacy compatibility functions (deprecated but kept for compatibility)
  public shared ({ caller }) func setUserProfile(displayName : Text) : async Bool {
    let profile : UserProfile = {
      displayName;
    };
    users.add(caller, profile);
    true;
  };

  public query ({ caller }) func getUserProfileLegacy() : async Text {
    switch (users.get(caller)) {
      case (null) { "Unknown" };
      case (?profile) { profile.displayName };
    };
  };

  public query ({ caller }) func getUserById(userId : UserId) : async Text {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
	    Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (users.get(userId)) {
      case (null) { "Unknown" };
      case (?profile) { profile.displayName };
    };
  };
};
