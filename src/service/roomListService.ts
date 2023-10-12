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
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async postRoomList(
  token: string,
  name: string,
	openAt: Date,
	invitedUserIds: string[], // 초대된 회원의 ID 목록
	hostUserIds : string[]
  ): Promise<Result<RoomDto[]>> {
    try {
      const response = await fetchAbsolute(`api/rooms`, {
        method: "POST",
        body: JSON.stringify({ name, openAt, invitedUserIds, hostUserIds }),
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
}

const roomListService = new RoomListService();
export default roomListService;
