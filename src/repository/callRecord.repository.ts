import client from "prisma/client";
import { uuid } from "uuidv4";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

const HOSPITAL_CODE = "H001";
const TENANT_CODE = "H0013";

// 모든 진료실의 이력 조회
export const findRecordAllRoom = async (
  roomId: string
): Promise<CallLogItemDto[] | null> => {
  return client.callRecord
    .findMany({
      where: { roomid: roomId },
    })
    .then((callLogItems) => {
      if (!callLogItems || callLogItems.length === 0) {
        return null;
      }

      return callLogItems.map((callLogItem) => {
        return CallLogItemDto.fromEntity(callLogItem);
      });
    })
    .catch((e) => {
      console.log("find Records By roomId error 500 " + e);
      throw e;
    });
};

// 기록 저장
export const createRecord = async (
  userId: string,
  roomId: string,
  joinAt: Date,
  exitAt: Date
): Promise<CallLogItemDto> => {
  // 생성할 record의 고유 아이디 (기본키 id)
  const recordUniqueId = uuid();

  const recordEntity = await client.callRecord.create({
    data: {
      id: recordUniqueId,
      userid: userId,
      roomid: roomId,
      joinat: joinAt,
      exitat: exitAt,
      hospitalcode: HOSPITAL_CODE,
      tenantcode: TENANT_CODE,
    },
  });

  return CallLogItemDto.fromEntity(recordEntity);
};
