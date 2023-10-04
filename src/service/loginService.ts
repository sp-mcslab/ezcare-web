import { Result } from "@/models/common/Result";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { SessionToken } from "@/stores/global/UserGlobalStore";

const HEADER = {
  "Content-Type": "application/json",
};

export class LoginService {

  public async login(id: string, password: string): Promise<Result<SessionToken>> {
    try {
      const response = await fetchAbsolute(`api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ id, password }),
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
}

const loginService = new LoginService();
export default loginService;
