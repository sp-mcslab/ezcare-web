import { makeAutoObservable, runInAction } from "mobx";
import adminService, { AdminService } from "@/service/adminService";
import { CallLogDto } from "@/dto/CallLogDto";
import si from "systeminformation";
import { bool } from "aws-sdk/clients/signer";
import { OperationLogDto } from "@/dto/OperationLogDto";
import { HospitalOptDto } from "@/dto/HospitalOptDto";

import userGlobalStore, {
  UserGlobalStore,
} from "@/stores/global/UserGlobalStore";

export class AdminStore {
  private _errorMessage: string = "";
  private _roomRecord: CallLogDto[] = [];
  private _operationRecord: OperationLogDto[] = [];

  private _cpuData: string = "";
  private _memoryData: string = "";
  private _diskData: string[] = [];
  private _networkData: string[] = [];
  private _didCheck: bool = false;

  constructor(
    private readonly _adminService: AdminService = adminService,
    private readonly _userGlobalStore: UserGlobalStore = userGlobalStore
  ) {
    makeAutoObservable(this);
  }

  public get errorMessage(): string {
    return this._errorMessage;
  }

  public get roomRecord(): CallLogDto[] {
    return this._roomRecord;
  }

  public get operationRecord(): OperationLogDto[] {
    return this._operationRecord;
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
    if (this._userGlobalStore.hospitalCode == "")
      await this._userGlobalStore.tryToLogin();
    const getRecordResult = await this._adminService.findRecordAllRoom(
      this._userGlobalStore.hospitalCode
    );
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

  public findOperationAllRoom = async (): Promise<void> => {
    if (this._userGlobalStore.hospitalCode == "")
      await this._userGlobalStore.tryToLogin();
    const getRecordResult = await this._adminService.findOperationAllRoom(
      this._userGlobalStore.hospitalCode
    );
    if (getRecordResult.isSuccess) {
      runInAction(() => {
        this._initErrorMessage();
        this._operationRecord = getRecordResult.getOrNull()!!;
        console.log(this._operationRecord);
      });
    } else {
      runInAction(() => {
        this._errorMessage = getRecordResult.throwableOrNull()!!.message;
        console.log(this._errorMessage);
      });
    }
  };

  public serverHealthCheck = async (): Promise<void> => {
    if (this._userGlobalStore.hospitalCode == "")
      await this._userGlobalStore.tryToLogin();
    const getServerHealthResult = await this._adminService.serverHealthCheck(
      this._userGlobalStore.hospitalCode
    );
    if (getServerHealthResult.isSuccess) {
      runInAction(() => {
        this._didCheck = true;
        this._initErrorMessage();
        const cpuResult = getServerHealthResult.getOrNull()!.cpu;

        this._cpuData =
          "speed : " +
          cpuResult.speed +
          " / cores : " +
          cpuResult.cores +
          " / processors : " +
          cpuResult.processors +
          " / load Percentage : " +
          cpuResult.loadPercentage;

        const memoryResult = getServerHealthResult.getOrNull()!.memory;
        this._memoryData =
          "total : " +
          memoryResult.totalByte +
          " / used : " +
          memoryResult.usageByte +
          " / available : " +
          memoryResult.availableByte;

        const diskResult = getServerHealthResult.getOrNull()!.disk;
        for (let i = 0; i < diskResult.length; i++) {
          this._diskData[i] = diskResult[i].diskInfo;
          this._diskData[i] += " ";
          this._diskData[i] += " / total : ";
          this._diskData[i] += diskResult[i].totalByte;
          this._diskData[i] += " / used : ";
          this._diskData[i] += diskResult[i].usageByte;
          this._diskData[i] += " / available : ";
          this._diskData[i] += diskResult[i].availableByte;
        }

        const networkResult = getServerHealthResult.getOrNull()!.network;
        for (let j = 0; j < networkResult.length; j++) {
          this._networkData[j] += "send : ";
          this._networkData[j] = networkResult[j].sendBytes;
          this._networkData[j] += " / send Dropped : ";
          this._networkData[j] += networkResult[j].sendDropped;
          this._networkData[j] += " / send Error : ";
          this._networkData[j] += networkResult[j].sendErrors;

          this._networkData[j] += " / receive : ";
          this._networkData[j] += networkResult[j].receiveBytes;
          this._networkData[j] += " / receive Dropped : ";
          this._networkData[j] += networkResult[j].receiveDropped;
          this._networkData[j] += " / receive Error : ";
          this._networkData[j] += networkResult[j].receiveErrors;
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

  private _joinOpt: boolean = false;
  private _shareOpt: boolean = false;
  private _patchOptionMessage?: string = undefined;

  public get joinOpt(): boolean {
    return this._joinOpt;
  }

  public get shareOpt(): boolean {
    return this._shareOpt;
  }

  public get patchOptionMessage(): string | undefined {
    return this._patchOptionMessage;
  }

  public clearPatchOptionMessage = () => {
    this._patchOptionMessage = undefined;
  };

  public getHospitalOption = async (): Promise<void> => {
    if (this._userGlobalStore.hospitalCode == "")
      await this._userGlobalStore.tryToLogin();
    const hospitalResult = await this._adminService.getHospitalOption(
      this._userGlobalStore.hospitalCode
    );
    if (hospitalResult.isSuccess) {
      this._joinOpt = hospitalResult.getOrNull()!.joinOpt;
    }
  };

  public updatejoinOpt = (option: boolean) => {
    this._joinOpt = option;
  };

  public updateshareOpt = (option: boolean) => {
    this._joinOpt = option;
  };

  public patchHospitalOption = async (): Promise<void> => {
    if (this._userGlobalStore.hospitalCode == "")
      await this._userGlobalStore.tryToLogin();

    const operationLogDto = new HospitalOptDto({
      hospitalCode: this._userGlobalStore.hospitalCode,
      joinOpt: this._joinOpt,
    });

    const getRecordResult = await this._adminService.patchHospitalOption(
      this._userGlobalStore.hospitalCode,
      operationLogDto
    );
    if (getRecordResult.isSuccess) {
      runInAction(() => {
        this._patchOptionMessage = "option_sucess";
      });
    } else {
      runInAction(() => {
        this._patchOptionMessage = "option_failure";
      });
    }
  };
}
