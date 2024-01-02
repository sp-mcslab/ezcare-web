import { Result } from "@/models/common/Result";
import { CallLogDto } from "@/dto/CallLogDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";
import { OperationLogDto } from "@/dto/OperationLogDto";
import { HealthLogDto } from "@/dto/HealthLogDto";
import { HospitalOptDto } from "@/dto/HospitalOptDto";

export class AdminService {
  public async findRecordAllRoom(
    hospitalCode: string
  ): Promise<Result<CallLogDto[]>> {
    try {
      const response = await fetchAbsolute(`api/admin/call-log`, {
        method: "GET",
        headers: {
          "hospital-code": hospitalCode,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async findOperationAllRoom(
    hospitalCode: string
  ): Promise<Result<OperationLogDto[]>> {
    try {
      const response = await fetchAbsolute(`api/admin/operation-log`, {
        method: "GET",
        headers: {
          "hospital-code": hospitalCode,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async postOperationLog(
    hospitalCode: string,
    operation: OperationLogItemDto
  ): Promise<string[] | undefined> {
    try {
      const response = await fetchAbsolute(`api/admin/operation-log`, {
        method: "POST",
        body: JSON.stringify(operation),
        headers: {
          "hospital-code": hospitalCode,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data.data.invitedUsers as string[];
    } catch (e) {
      return;
    }
  }
  public async serverHealthCheck(
    hospitalCode: string
  ): Promise<Result<HealthLogDto>> {
    try {
      const response = await fetchAbsolute(`api/admin/server-health`, {
        method: "GET",
        headers: {
          "hospital-code": hospitalCode,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }

  public async getHospitalOption(
    hospitalCode: string
  ): Promise<Result<HospitalOptDto>> {
    try {
      const response = await fetchAbsolute(`api/admin/hospital/option`, {
        method: "GET",
        headers: {
          "hospital-code": hospitalCode,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        return Result.createSuccessUsingResponseData(response);
      } else {
        return Result.createErrorUsingResponseMessage(response);
      }
    } catch (e) {
      return Result.createErrorUsingException(e);
    }
  }
}

const adminService = new AdminService();
export default adminService;
