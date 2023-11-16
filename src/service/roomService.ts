import { Result } from "@/models/common/Result";
import { RoomCreateRequestBody } from "@/models/room/RoomCreateRequestBody";
import { RoomOverview } from "@/models/room/RoomOverview";
import { Room } from "@/stores/RoomListStore";
import { RoomDeleteRequestBody } from "@/models/room/RoomDeleteRequestBody";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
  "Content-Type": "application/json",
};

export class RoomService {
  public async getRooms(page: number): Promise<Result<RoomOverview[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms?page=${page}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async getRecentRooms(userId: string): Promise<Result<RoomOverview[]>> {
    try {
      const response = await fetchAbsolute(`api/users/${userId}/recent-rooms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async createRoom(room: Room): Promise<Result<string>> {
    try {
      const requestBody = new RoomCreateRequestBody(room);
      const response = await fetchAbsolute(`api/rooms`, {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: HEADER,
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseMessage(response);
      } else {
        return await Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async deleteRoom(roomId: string) {
    try {
      const requestBody = new RoomDeleteRequestBody(roomId);
      const response = await fetchAbsolute(`api/rooms/${roomId}`, {
        method: "DELETE",
        body: JSON.stringify(requestBody),
        headers: HEADER,
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return await Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

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

  public async uploadThumbnailImage(
    roomId: string,
    formData: FormData
  ): Promise<Result<string>> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}/thumbnail`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        return await Result.createErrorUsingResponseMessage(response);
      }
      return Result.createSuccessUsingResponseData(response);
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }
}

const roomService = new RoomService();
export default roomService;