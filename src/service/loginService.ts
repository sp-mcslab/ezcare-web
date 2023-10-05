import { Result } from "@/models/common/Result";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { SessionTokenDto } from "@/dto/SessionTokenDto";

const HEADER = {
  "Content-Type": "application/json",
};

export class LoginService {
  public async login(
    id: string,
    password: string
  ): Promise<Result<SessionTokenDto>> {
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
  public async validationJwt(token: string): Promise<boolean> {
    try {
      const response = await fetchAbsolute(`api/auth/validation`, {
        method: "POST",
        headers: {
          "x-ezcare-session-token": token,
        },
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

const loginService = new LoginService();
export default loginService;
