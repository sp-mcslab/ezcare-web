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

  public async saveUserInfoTest(
    username: string,
    property_code: string
  ): Promise<boolean> {
    try {
      localStorage.setItem("username", username);
      localStorage.setItem("property_code", property_code);

      return true;
    } catch (e) {
      return false;
    }
  }

  public async removeUserInfoTest(): Promise<boolean> {
    try {
      localStorage.setItem("username", "");
      localStorage.setItem("property_code", "");

      return true;
    } catch (e) {
      return false;
    }
  }

  public async getUserInfoTest(): Promise<{
    username: string | null;
    property_code: string | null;
  }> {
    try {
      const username = localStorage.getItem("username");
      const property_code = localStorage.getItem("property_code");

      return { username: username, property_code: property_code };
    } catch (e) {
      return { username: null, property_code: null };
    }
  }

  public async manageUserInfoOp(): Promise<{
    username: string | null;
    property_code: string | null;
  }> {
    try {
      // TODO: 더미데이터 삭제 후 username, property_code 를 반환하는 API 호출해서 사용
      const username = "N0001";
      const property_code = "A0013";

      return { username: username, property_code: property_code };
    } catch (e) {
      return { username: null, property_code: null };
    }
  }
}

const userService = new UserService();
export default userService;
