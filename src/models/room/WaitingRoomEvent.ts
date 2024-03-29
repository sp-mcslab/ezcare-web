import { RoomJoiner } from "@/models/room/RoomJoiner";

export abstract class WaitingRoomEvent {}

export class OtherPeerJoinedRoomEvent extends WaitingRoomEvent {
  constructor(readonly joiner: RoomJoiner) {
    super();
  }
}

export class OtherPeerExitedRoomEvent extends WaitingRoomEvent {
  constructor(readonly exitedUserId: string) {
    super();
  }
}

export class ApprovedJoiningRoomEvent extends WaitingRoomEvent {}

export class RejectedJoiningRoomEvent extends WaitingRoomEvent {}

export class CancelJoinRequestEvent extends WaitingRoomEvent {
  constructor(readonly cancelUserId: string) {
    super();
  }
}
