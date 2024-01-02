import { Result } from "@/models/common/Result";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
  "Content-Type": "application/json",
};

export class UserService {
  public async findUserIsHost(
    hospitalCode: string,
    userId: string,
    roomId: string
  ): Promise<boolean> {
    try {
      const response = await fetchAbsolute(
        `api/rooms/${roomId}/host/${userId}`,
        {
          method: "GET",
          headers: {
            "hospital-code": hospitalCode,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      return data.data as boolean;
    } catch (e) {
      return false;
    }
  }

  public async patchDisplayName(
    token: string,
    displayName: string
  ): Promise<Result<string>> {
    try {
      const response = await fetchAbsolute(`api/auth/user/displayname`, {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseMessage(response);
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
