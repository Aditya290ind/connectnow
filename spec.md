# ConnectNow

## Current State
Functional video meeting app with WebRTC peer-to-peer, chat, participant list, mute/camera controls, screen share, and a 9-tile video grid. No whiteboard, no waiting room, no meeting lock, no advanced host controls.

## Requested Changes (Diff)

### Add
- **Whiteboard**: Full-screen canvas overlay with drawing tools (pen, eraser, shapes, colors, clear). All participants see the same whiteboard (simulated via broadcast in local state since no real-time sync backend). Host can toggle whiteboard on/off for all.
- **Waiting Room**: When host enables it, new joiners land in a lobby view instead of the meeting. Host sees a badge with pending count and can admit or reject each person.
- **Meeting Lock**: Host can lock the room so no new participants can join.
- **Advanced Host Controls panel**: Mute all, unmute all, stop all video, remove participant, disable chat for all, enable/disable waiting room toggle, lock/unlock meeting, lower all hands.
- **Raise Hand**: Participants can raise/lower their hand; host sees indicator on their tile.
- **Reactions**: Quick emoji reactions (thumbs up, clap, laugh, heart) that float up briefly.
- **Breakout Rooms UI**: Visual placeholder for breakout room assignment (no WebRTC split needed -- UI only).
- **Recording indicator**: Visual REC indicator toggle (UI only, no actual recording).
- **Virtual background selector**: UI option to blur background (CSS filter on local video).
- **Meeting timer**: Elapsed time counter shown in toolbar.
- **Participant limit display**: Shows current count vs. no limit.

### Modify
- Room.tsx: Add tabbed side panel (Chat | Participants | Whiteboard). Add host control toolbar section. Rework bottom toolbar to include new controls.
- Dashboard.tsx: Add toggle to enable/disable waiting room when creating/joining a meeting.

### Remove
- Nothing removed.

## Implementation Plan
1. Add whiteboard canvas component (freehand draw, color picker, eraser, clear, shapes toggle).
2. Add waiting room state + lobby UI for non-admitted users.
3. Add meeting lock state gated by host.
4. Add host controls panel: mute all, stop video all, remove, disable chat, lower hands.
5. Add raise hand + emoji reactions with float animation.
6. Add recording indicator, meeting timer, virtual background blur toggle.
7. Add breakout rooms placeholder UI.
8. Update side panel to include Whiteboard tab.
