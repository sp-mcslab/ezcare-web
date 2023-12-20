import client from "prisma/client";
import { uuid } from "uuidv4";
import { Transaction, OperationLog } from "@prisma/client";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";

// 오퍼레이션 기록 저장
export const createOperationLog = async (
  roomId: string,
  operator: string,
  recipient: string,
  transaction: Transaction,
  time: Date,
  hospitalCode: string
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
      hospitalcode: hospitalCode,
    },
  });

  return OperationLogItemDto.fromEntity(operationEntity);
};
