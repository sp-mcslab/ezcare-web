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
        `api/rooms/${roomId}/host?userId=${userId}`,
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
}

const userService = new UserService();
export default userService;
