import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable, observable, runInAction } from "mobx";

export interface Product {
  id: number;
  name: string;
}

export class AuthStore {
  private _userid: string = "";
  private _userpassword: string = "";
  private _userstate: bool = false;

  constructor() {
    makeAutoObservable(this);
  }

  public get UserId(): string {
    return this._userid;
  }

  public get UserPassword(): string {
    return this._userpassword;
  }

  public updateUserId = (id: string) => {
    this._userid = id;
  };

  public updatUserPassword = (password: string) => {
    this._userpassword = password;
  };

  public login = () => {
    const userid = this._userid;
    const userpassword = this._userpassword;
    if (userid === "admin" && userpassword === "1234") {
      this._userstate = true;
      return true;
    }
    return false;
  };

  public logout = () => {
    this._userid = "";
    this._userpassword = "";
    this._userstate = false;
  };

  public get LoginState(): bool | undefined {
    return this._userstate;
  }
}
