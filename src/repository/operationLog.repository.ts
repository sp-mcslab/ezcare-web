import client from "image/client";
import { uuid } from "uuidv4";
import { Transaction, OperationLog } from "@prisma/client";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";

const HOSPITAL_CODE = "H001";
const TENANT_CODE = "H0013";

// 오퍼레이션 기록 저장
export const createOperationLog = async (
  roomId: string,
  operator: string,
  recipient: string,
  transaction: Transaction,
  time: Date
): Promise<OperationLogItemDto> => {
  // 생성할 record의 고유 아이디 (기본키 id)
  const recordUniqueId = uuid();

  console.log(
    roomId +
      " // " +
      operator +
      " // " +
      recipient +
      " // " +
      transaction +
      " // " +
      time
  );

  const operationEntity = await client.operationLog.create({
    data: {
      id: recordUniqueId,
      roomid: roomId,
      operator: operator,
      recipient: recipient,
      transaction: transaction,
      time: time,
      hospitalcode: HOSPITAL_CODE,
      tenantcode: TENANT_CODE,
    },
  });

  return OperationLogItemDto.fromEntity(operationEntity);
};
