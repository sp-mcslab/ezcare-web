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
}

const roomListService = new RoomListService();
export default roomListService;
