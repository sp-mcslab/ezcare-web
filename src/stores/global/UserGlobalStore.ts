import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable } from "mobx";
import userService, { UserService } from "@/service/userService";
import { Result } from "@/models/common/Result";
import { getUserNameFromLocalStorage } from "@/utils/JwtUtil";

export class UserGlobalStore {
  private _didLogin: boolean = false;
  private _hospitalCode: string = "";

  constructor(private readonly _userService: UserService = userService) {
    makeAutoObservable(this);
  }

  public async login(username: string, property_code: string): Promise<void> {
    localStorage.setItem("username", username);
    localStorage.setItem("property_code", property_code);
    this._didLogin = true;
  }

  public logout = () => {
    localStorage.setItem("username", "");
    localStorage.setItem("property_code", "");
    this._didLogin = false;
  };

  public tryToLogin = async (): Promise<void> => {
    const username = localStorage.getItem("username");
    if (username == null) {
      return;
    }
    this._didLogin = true;
    const property_code = localStorage.getItem("property_code");
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
