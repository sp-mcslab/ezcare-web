import { RoomJoiner } from "@/models/room/RoomJoiner";

export interface WaitingRoomData {
  /**
   * 공부방에 참여한 사람들의 목록이다.
   */
  readonly joinerList: RoomJoiner[];

  /**
   * 공부방의 최대 참여 가능한 인원이다.
   */
  readonly capacity: number;

  /**
   * 공부방의 방장 ID이다.
   */
  readonly masterId: string;
}
