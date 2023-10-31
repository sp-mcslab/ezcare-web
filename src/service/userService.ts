import { Result } from "@/models/common/Result";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { UserRoleDto } from "@/dto/UserRoleDto";

const HEADER = {
  "Content-Type": "application/json",
};

export class UserService {
  public async findUserRole(token: string): Promise<Result<UserRoleDto>> {
    try {
      const response = await fetchAbsolute(`api/auth/user`, {
        method: "POST",
        headers: {
          "x-ezcare-session-token": token,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        console.log(response);
        return await Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async findUserIsHost(token: string, roomId: string): Promise<boolean> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}/host`, {
        method: "GET",
        body: JSON.stringify({roomId}),
        headers: {
          "x-ezcare-session-token": token,
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

const userService = new UserService();
export default userService;
