import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
  "Content-Type": "application/json",
};

export class RoomService {

  public async getInvitedUsers(roomId: string): Promise<string[] | undefined> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}/invite`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data.data.invitedUsers as string[];
    } catch (e) {
      return;
    }
  }

  public async postInvitation(
    roomId: string,
    userId: string
  ): Promise<string[] | undefined> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}/invite`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: HEADER,
      });
      const data = await response.json();
      return data.data.invitedUsers as string[];
    } catch (e) {
      return;
    }
  }
}

const roomService = new RoomService();
export default roomService;
