import { makeAutoObservable, runInAction } from "mobx";
import adminService, { AdminService } from "@/service/adminService";
import { CallLogDto } from "@/dto/CallLogDto";

export class AdminStore {
  private _errorMessage: string = "";
  private _roomRecord: CallLogDto[] = [];

  constructor(private readonly _adminService: AdminService = adminService) {
    makeAutoObservable(this);
  }

  public get errorMessage(): string {
    return this._errorMessage;
  }

  public get roomRecord(): CallLogDto[] {
    return this._roomRecord;
  }

  private _initErrorMessage() {
    this._errorMessage = "";
  }

  public findRecordAllRoom = async (): Promise<void> => {
    const getRecordResult = await this._adminService.findRecordAllRoom();
    if (getRecordResult.isSuccess) {
      runInAction(() => {
        this._initErrorMessage();
        this._roomRecord = getRecordResult.getOrNull()!!;
        console.log(this._roomRecord);
      });
    } else {
      runInAction(() => {
        this._errorMessage = getRecordResult.throwableOrNull()!!.message;
        console.log(this._errorMessage);
      });
    }
  };
}
