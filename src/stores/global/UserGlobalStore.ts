import { bool } from "aws-sdk/clients/signer";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { verifyJWT } from "@/utils/JwtUtil";

export class SessionToken {
  constructor(readonly sessionToken: string) {
    makeAutoObservable(this);
  }
}

export class UserGlobalStore {
  private _currentUserId: string = "";
  private _sessionToken: string = "";

  constructor() {
    makeAutoObservable(this);
  }

  public get successToLogin(): bool | undefined {
    if (typeof window !== "undefined") {
      this._sessionToken = localStorage.getItem("sessionToken")!!;
      const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";
      const token = verifyJWT(String(this._sessionToken), secretKey);
      console.log(token);
    }
    return !!this._currentUserId;
  }
}

const userGlobalStore = new UserGlobalStore();
export default userGlobalStore;
