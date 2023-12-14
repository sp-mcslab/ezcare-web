import { Result } from "@/models/common/Result";
import { CallLogDto } from "@/dto/CallLogDto";
import { HealthLogDto } from "@/dto/HealthLogDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";
import { OperationLogDto } from "@/dto/OperationLogDto";

const HEADER = {
  "Hospital-Code": "A0013",
  "Content-Type": "application/json",
};

export class AdminService {
  public async findRecordAllRoom(): Promise<Result<CallLogDto[]>> {
    try {
      const response = await fetchAbsolute(`api/admin/call-log`, {
        method: "GET",
        headers: HEADER,
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

  public async findOperationAllRoom(): Promise<Result<OperationLogDto[]>> {
    try {
      const response = await fetchAbsolute(`api/admin/operation-log`, {
        method: "GET",
        headers: HEADER,
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
    operation: OperationLogItemDto
  ): Promise<string[] | undefined> {
    try {
      const response = await fetchAbsolute(`api/admin/operation-log`, {
        method: "POST",
        body: JSON.stringify(operation),
        headers: HEADER,
      });
      const data = await response.json();
      return data.data.invitedUsers as string[];
    } catch (e) {
      return;
    }
  }

  public async serverHealthCheck(): Promise<Result<HealthLogDto>> {
    try {
      const response = await fetchAbsolute(`api/admin/server-health`, {
        method: "GET",
        headers: HEADER,
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
