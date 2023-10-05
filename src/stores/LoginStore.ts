import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable } from "mobx";
import userGlobalStore, {
  UserGlobalStore,
} from "@/stores/global/UserGlobalStore";

export class LoginStore {
  private _userId: string = "";
  private _userPassword: string = "";
  private _errorMessage: string | null = null;

  constructor(
    private readonly _userGlobalStore: UserGlobalStore = userGlobalStore
  ) {
    makeAutoObservable(this);
  }

  public get userId(): string {
    return this._userId;
  }

  public get userPassword(): string {
    return this._userPassword;
  }

  public get errorMessage(): string | null {
    return this._errorMessage;
  }

  public errorMessageShown() {
    this._errorMessage = null;
  }

  public updateUserId = (id: string) => {
    this._userId = id;
  };

  public updateUserPassword = (password: string) => {
    this._userPassword = password;
  };

  public login = async (): Promise<void> => {
    const loginResult = await this._userGlobalStore.login(
      this._userId,
      this._userPassword
    );

    if (loginResult.isFailure) {
      this._errorMessage = loginResult.throwableOrNull()!.message;
    }
  };

  public logout = () => {
    this._userId = "";
    this._userPassword = "";
  };

  public get didLogin(): bool | undefined {
    return this._userGlobalStore.didLogin;
  }
}
