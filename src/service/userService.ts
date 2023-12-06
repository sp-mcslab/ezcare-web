import { Result } from "@/models/common/Result";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { UserSearchDto } from "@/dto/UserSearchDto";

const HEADER = {
  "Content-Type": "application/json",
};

export class UserService {
  public async findUserRole(token: string): Promise<Result<UserSearchDto>> {
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

  public async findUserId(token: string): Promise<string | null> {
    try {
      const response = await fetchAbsolute(`api/auth/user`, {
        method: "POST",
        headers: {
          "x-ezcare-session-token": token,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      const id = data.data.id;
      return id;
    } catch (e) {
      console.log("find User from session error " + e);
      return null;
    }
  }

  public async findUserIsHost(token: string, roomId: string): Promise<boolean> {
    try {
      const response = await fetchAbsolute(`api/rooms/${roomId}/host`, {
        method: "GET",
        headers: {
          "x-ezcare-session-token": token,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data.data as boolean;
    } catch (e) {
      return false;
    }
  }

  public async findUserById(userId: string): Promise<Result<UserSearchDto>> {
    try {
      const response = await fetchAbsolute(`api/user`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: HEADER,
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
}

const userService = new UserService();
export default userService;
