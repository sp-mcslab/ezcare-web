import client from "prisma/client";
import { uuid } from "uuidv4";
import { CallLogItemDto } from "@/dto/CallLogItemDto";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";

/**
 * 모든 진료실의 record를 조회한다.
 * @param: 진료실 별로 Mapping
 */
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

/**
 * 진료실에 입퇴장하는 사용자의 Record를 저장한다.
 */
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

/**
 * 진료실 퇴장 시각이 달라진 경우, 사용자의 퇴장 일시를 갱신한다.
 */
export const updateRecord = async (
  hospitalCode: string,
  exitDate: Date
): Promise<boolean> => {
  const recordEntity = await client.callRecord.updateMany({
    data: {
      exitat: exitDate,
    },
    where: {
      hospitalcode: hospitalCode,
    },
  });

  if (recordEntity) return true;
  else return false;
};

/**
 * 진료실 별 모든 Operation을 조회한다.
 * @param: 진료실 별로 Mapping
 */
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

/**
 * 접속 중인 유저들을 조회한다 - callRecord 상에서 exitat이 채워지지 않은 유저 검색
 */
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
