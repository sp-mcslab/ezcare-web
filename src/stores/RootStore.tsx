import { RoomListStore } from "@/stores/RoomListStore";
import { FriendStore } from "@/stores/FriendStore";

export class RootStore {
  roomListStore;
  friendStore;
  constructor() {
    this.roomListStore = new RoomListStore(this);
    this.friendStore = new FriendStore(this);
  }
}
