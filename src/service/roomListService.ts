import { Result } from "@/models/common/Result";
import { RoomDto } from "@/dto/RoomDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

export class RoomListService {
  public async getRoomList(hospitalcode: string, token: string): Promise<Result<RoomDto[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms`, {
        method: "GET",
        headers: {
          "hospital-code": hospitalcode,
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
    hospitalcode: string,
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
          "hospital-code": hospitalcode,
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
    hospitalcode: string,
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
          "hospital-code": hospitalcode,
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

  public async deleteRoomList(hospitalcode: string,roomId: string) {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}`, {
        method: "DELETE",
        body: JSON.stringify({ roomId }),
        headers: {
          "Content-Type": "application/json",
          "hospital-code": hospitalcode,
        },
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

  public async getRoomById(hospitalcode: string, roomId: string): Promise<Result<RoomDto>> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "hospital-code": hospitalcode,
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
}

const roomListService = new RoomListService();
export default roomListService;
