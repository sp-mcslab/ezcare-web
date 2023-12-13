import { Result } from "@/models/common/Result";
import { CallLogDto } from "@/dto/CallLogDto";
import { HealthLogDto } from "@/dto/HealthLogDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
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
