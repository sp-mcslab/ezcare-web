import { bool } from "aws-sdk/clients/signer";
import loginService, { LoginService } from "@/service/loginService";
import { makeAutoObservable, observable, runInAction } from "mobx";

export class LoginStore {
  private _userId: string = "";
  private _userPassword: string = "";
  private _successToLogin: bool = false;

  constructor(private readonly _loginService: LoginService = loginService) {
    makeAutoObservable(this);
  }

  public get userId(): string {
    return this._userId;
  }

  public get userPassword(): string {
    return this._userPassword;
  }

  public updateUserId = (id: string) => {
    this._userId = id;
  };

  public updateUserPassword = (password: string) => {
    this._userPassword = password;
  };

  public login = async (): Promise<void> => {
    const loginResult = await this._loginService.login(
      this._userId,
      this._userPassword
    );

    if (loginResult.isSuccess) {
      runInAction(() => {
        const resultData = loginResult.getOrNull()!!;
        localStorage.setItem("sessionToken", resultData.sessionToken);
        
      });
    } else {
      alert("ID 혹은 비밀번호가 잘못되었습니다.");
    }
    return;
  };

  public logout = () => {
    this._userId = "";
    this._userPassword = "";
    this._successToLogin = false;
  };

  public get loginState(): bool | undefined {
    return this._successToLogin;
  }
}
