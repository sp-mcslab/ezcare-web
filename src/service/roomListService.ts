import { Result } from "@/models/common/Result";
import { RoomDto } from "@/dto/RoomDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
  "Content-Type": "application/json",
};

export class RoomListService {
  public async getRoomList(token: string): Promise<Result<RoomDto[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-ezcare-session-token": token,
        },
      });
      console.log(response);
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async postRoomNow(
    token: string,
    baseUrl: string,
    name: string,
    invitedUserIds: string[], // 초대된 회원의 ID 목록
    hostUserIds: string[]
  ): Promise<Result<RoomDto[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms/post-now`, {
        method: "POST",
        body: JSON.stringify({
          name,
          invitedUserIds,
          hostUserIds,
          baseUrl,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-ezcare-session-token": token,
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

  public async postRoomLater(
    token: string,
    baseUrl: string,
    name: string,
    openAt: Date,
    invitedUserIds: string[], // 초대된 회원의 ID 목록
    hostUserIds: string[]
  ): Promise<Result<RoomDto[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms/post-later`, {
        method: "POST",
        body: JSON.stringify({
          name,
          openAt,
          invitedUserIds,
          hostUserIds,
          baseUrl,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-ezcare-session-token": token,
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

  public async deleteRoomList(roomId: string) {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}`, {
        method: "DELETE",
        body: JSON.stringify({ roomId }),
        headers: HEADER,
      });
      if (response.ok) {
        return Result.success(undefined);
      } else {
        return await Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async checkAndUpdateFlag() {
    try {
      const response = await fetchAbsolute(`api/rooms/flag`, {
        method: "GET",
        headers: HEADER,
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

  public async getRoomById(roomId: string): Promise<Result<RoomDto>> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}`, {
        method: "GET",
        headers: HEADER,
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
}

const roomListService = new RoomListService();
export default roomListService;
