import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable } from "mobx";
import userService, { UserService } from "@/service/userService";

export class UserGlobalStore {
  private _didLogin: boolean = false;
  private _username: string = "";
  private _hospitalCode: string = "";

  constructor(private readonly _userService: UserService = userService) {
    makeAutoObservable(this);
  }

  public async login(username: string, property_code: string): Promise<void> {
    await userService.saveUserInfoTest(username, property_code);

    this._username = username;
    this._hospitalCode = property_code;

    this._didLogin = true;
  }

  public logout = () => {
    userService.removeUserInfoTest();
    this._didLogin = false;
  };

  public tryToLogin = async (): Promise<void> => {
    const { username, property_code } = await userService.getUserInfoTest();
    if (username != null) {
      this._username = username;
    }
    this._didLogin = true;
    if (property_code != null) {
      this._hospitalCode = property_code;
    }
  };

  public get didLogin(): bool | undefined {
    return this._didLogin;
  }

  public get hospitalCode(): string {
    return this._hospitalCode;
  }
}

const userGlobalStore = new UserGlobalStore();
export default userGlobalStore;
