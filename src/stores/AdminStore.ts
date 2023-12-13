import { makeAutoObservable, runInAction } from "mobx";
import adminService, { AdminService } from "@/service/adminService";
import { CallLogDto } from "@/dto/CallLogDto";
import si from "systeminformation";
import { bool } from "aws-sdk/clients/signer";

export class AdminStore {
  private _errorMessage: string = "";
  private _roomRecord: CallLogDto[] = [];

  private _cpuData: string = "";
  private _memoryData: string = "";
  private _diskData: string[] = [];
  private _networkData: string[] = [];
  private _didCheck: bool = false;

  constructor(private readonly _adminService: AdminService = adminService) {
    makeAutoObservable(this);
  }

  public get errorMessage(): string {
    return this._errorMessage;
  }

  public get roomRecord(): CallLogDto[] {
    return this._roomRecord;
  }

  public get cpuData(): string {
    return this._cpuData;
  }

  public get memoryData(): string {
    return this._memoryData;
  }

  public get diskData(): string[] {
    return this._diskData;
  }

  public get networkData(): string[] {
    return this._networkData;
  }

  private _initErrorMessage() {
    this._errorMessage = "";
  }

  public get didCheck(): bool {
    return this._didCheck;
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

  public serverHealthCheck = async (): Promise<void> => {
    const getServerHealthResult = await this._adminService.serverHealthCheck();
    if (getServerHealthResult.isSuccess) {
      runInAction(() => {
        this._didCheck = true;
        this._initErrorMessage();
        const cpuResult = getServerHealthResult.getOrNull()!.cpu;
        this._cpuData =
          cpuResult.manufacturer  +
          " " +
          cpuResult.brand +
          " " +
          cpuResult.vendor +
          " " +
          cpuResult.family +
          " " +
          cpuResult.model;

        const memoryResult = getServerHealthResult.getOrNull()!.memory;
        this._memoryData =
          "total : " +
          memoryResult.total +
          " used : " +
          memoryResult.used +
          " available : " +
          memoryResult.available;

        const diskResult = getServerHealthResult.getOrNull()!.disk;
        for (let i = 0; i < diskResult.length; i++) {
          this._diskData[i] = diskResult[i].fs;
          this._diskData[i] += " ";
          this._diskData[i] += diskResult[i].type;
          this._diskData[i] += " size : ";
          this._diskData[i] += diskResult[i].size;
          this._diskData[i] += " used : ";
          this._diskData[i] += diskResult[i].used;
        }
        
        const networkResult = getServerHealthResult.getOrNull()!.network;
        for (let j = 0; j < networkResult.length; j++) {
          this._networkData[j] = networkResult[j].iface;
          this._networkData[j] += " ";
          this._networkData[j] += networkResult[j].ms;
          this._networkData[j] += "ms";
        }

        console.log(cpuResult);
        console.log(memoryResult);
        console.log(diskResult);
        console.log(networkResult);
      });
    } else {
      runInAction(() => {
        this._didCheck = true;
        this._errorMessage = getServerHealthResult.throwableOrNull()!!.message;
        console.log(this._errorMessage);
      });
    }
  };
}
