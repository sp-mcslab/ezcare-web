import { Room } from "@/stores/RoomListStore";

export class RoomCreateRequestBody {
  private readonly _room: Room;
  constructor(room: Room) {
    this._room = room;
  }
  get room() {
    return this._room;
  }
}
