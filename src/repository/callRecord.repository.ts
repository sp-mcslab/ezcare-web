import client from "prisma/client";
import { uuid } from "uuidv4";
import { RoomDto } from "@/dto/RoomDto";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

const HOSPITAL_CODE = "A0013";
const TENANT_CODE = "A001";
export const findRecordByRoomId = async (
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

//TODO : 기록 저장할 때 사용하기
export const createRecord = async (
  creatorId: string,
  name: string,
  createdAt: Date,
  openAt: Date,
  invitedUsers: string[],
  hostedUsers: string[]
): Promise<RoomDto> => {
  // 생성할 방의 고유 아이디 (기본키 id)
  const roomUniqueId = uuid();

  const roomEntity = await client.room.create({
    data: {
      id: roomUniqueId,
      User: {
        connect: {
          id: creatorId,
        },
      },
      name: name,
      createdat: createdAt,
      openat: openAt,
      deletedat: null,
      Hospital: {
        connect: {
          code_tenantcode: {
            code: HOSPITAL_CODE,
            tenantcode: TENANT_CODE,
          },
        },
      },
      Host: {
        createMany: {
          data: hostedUsers.map((userid) => ({
            userid: userid,
          })),
        },
      },
      Invite: {
        createMany: {
          data: invitedUsers.map((userid) => ({
            userid: userid,
          })),
        },
      },
    },
  });

  return RoomDto.fromEntity(roomEntity);
};

// export const findRoomById = async (roomId: string): Promise<Room | null> => {
//   return await prisma.room.findUnique({
//     where: {
//       id: roomId,
//     },
//   });
// };
//
// export const isRoomFull = async (roomId: string): Promise<boolean> => {
//   const histories = await prisma.study_history.findMany({
//     where: {
//       room_id: roomId,
//       exit_at: undefined,
//     },
//   });
//   return histories.length === MAX_ROOM_CAPACITY;
// };
//
// export const isUserBlockedAtRoom = async (
//   userId: string,
//   roomId: string
// ): Promise<boolean> => {
//   const block = await prisma.block.findUnique({
//     where: {
//       room_id_user_id: {
//         room_id: roomId,
//         user_id: userId,
//       },
//     },
//   });
//   return block != null;
// };

//
// export const findRecentRooms = async (userId: string) => {
//   const rooms = await client.study_history.findMany({
//     where: { user_id: userId, room: { deleted_at: null } },
//     distinct: "room_id",
//     take: MAX_RECENT_ROOM_NUM,
//     orderBy: { join_at: "desc" },
//     include: {
//       room: { include: { study_history: { where: { exit_at: null } } } },
//     },
//   });
//   return rooms.map((rooms) => {
//     return new RoomOverview(
//       rooms.room.id,
//       rooms.room.master_id,
//       rooms.room.title,
//       rooms.room.password ? true : false,
//       rooms.room.thumbnail,
//       rooms.room.study_history.length,
//       MAX_ROOM_CAPACITY,
//       [] //room.room_tags
//     );
//   });
// };
//
//
