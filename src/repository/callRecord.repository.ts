import client from "prisma/client";
import { uuid } from "uuidv4";
import { CallLogItemDto } from "@/dto/CallLogItemDto";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";
// 모든 진료실의 입퇴장 이력 조회
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
  exitAt: Date,
  hospitalCode: string
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
      hospitalcode: hospitalCode,
    },
  });

  return CallLogItemDto.fromEntity(recordEntity);
};

// 모든 진료실의 오퍼레이션 조회
export const findOperationLogByRoomId = async (
  roomId: string
): Promise<OperationLogItemDto[] | null> => {
  try {
    const operationLogs = await client.operationLog.findMany({
      where: {
        roomid: roomId,
      },
    });

    const operationLogDtos = operationLogs.map((operationLog) =>
      OperationLogItemDto.fromEntity(operationLog)
    );

    return operationLogDtos;
  } catch (error) {
    console.error("Error finding operation logs:", error);
    return null;
  }
};

// 접속중인 유저들 찾기
export const findOnlineUsers = async (
  hospitalCode: string
): Promise<{
  [roomId: string]: string[];
} | null> => {
  const onlineUsers = await client.callRecord.findMany({
    where: {
      AND: [{ exitat: null }, { hospitalcode: hospitalCode }],
    },
  });

  if (!onlineUsers || onlineUsers.length === 0) {
    return null;
  }

  const groupedUsers = onlineUsers.reduce((result, user) => {
    const roomId = user.roomid;

    if (!result[roomId]) {
      result[roomId] = [];
    }

    result[roomId].push(user.userid);
    return result;
  }, {} as { [roomId: string]: string[] });

  console.log("online :: ", groupedUsers);
  return groupedUsers;
};
