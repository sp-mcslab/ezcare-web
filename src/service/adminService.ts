import { Result } from "@/models/common/Result";
import { CallLogDto } from "@/dto/CallLogDto";
import { fetchAbsolute } from "@/utils/fetchAbsolute";

const HEADER = {
  "Content-Type": "application/json",
};

export class AdminService {
  public async findRecordByRoomId(): Promise<Result<CallLogDto[]>> {
    try {
      const response = await fetchAbsolute(`api/admin/call-log`, {
        method: "GET",
        headers: HEADER
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
