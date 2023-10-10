import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable } from "mobx";
import loginService, { LoginService } from "@/service/loginService";
import { Result } from "@/models/common/Result";
import {
  getSessionTokenFromLocalStorage,
  setSessionTokenLocalStorage,
} from "@/utils/JwtUtil";

export class UserGlobalStore {
  private _didLogin: boolean = false;

  constructor(private readonly _loginService: LoginService = loginService) {
    makeAutoObservable(this);
  }

  public async login(id: string, password: string): Promise<Result<void>> {
    const result = await this._loginService.login(id, password);
    if (result.isSuccess) {
      const sessionToken = result.getOrNull()!.sessionToken;
      this._didLogin = true;
      setSessionTokenLocalStorage(sessionToken);
      return Result.success(undefined);
    }
    this._didLogin = false;
    return Result.error(new Error(result.throwableOrNull()!.message));
  }

  public logout = () => {
    this._didLogin = false;
    setSessionTokenLocalStorage("");
  };

  public tryToLoginWithSessionToken = async (): Promise<void> => {
    const sessionToken = getSessionTokenFromLocalStorage();
    if (sessionToken == null) {
      return;
    }
    this._didLogin = await this._loginService.validationJwt(sessionToken);
  };

  public get didLogin(): bool | undefined {
    return this._didLogin;
  }
}

const userGlobalStore = new UserGlobalStore();
export default userGlobalStore;
