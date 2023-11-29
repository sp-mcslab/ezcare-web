import client from "prisma/client";
import { uuid } from "uuidv4";
import { RoomDto } from "@/dto/RoomDto";
import { UserDto } from "@/dto/UserDto";
import { Room, RoomFlag } from "@prisma/client";

const HOSPITAL_CODE = "A0013";
const TENANT_CODE = "A001";
export const findAllRooms = async (): Promise<Room[] | undefined> => {
  try {
    return await client.room.findMany({
      orderBy: {
        createdat: "desc", // Replace 'createdAt' with the field you want to sort by
      },
    });
  } catch (e) {
    console.log("find All Rooms Error 500 " + e);
  }
};

export const createRoom = async (
  creatorId: string,
  name: string,
  createdAt: Date,
  openAt: Date,
  invitedUsers: string[],
  hostedUsers: string[],
  flag: RoomFlag
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
      flag: flag,
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

export const deleteRoomReq = async (roomId: string) => {
  if (roomId == null) return undefined;
  try {
    await client.room.updateMany({
      where: {
        OR: [
          { AND: [{ id: roomId }, { deletedat: null }] },
          {
            AND: [
              { id: roomId },
              { NOT: { deletedat: null } },
              { flag: RoomFlag.OPENED },
            ],
          },
        ],
      },
      data: { deletedat: new Date(), flag: RoomFlag.CLOSED },
    });
    return roomId;
  } catch (e) {
    console.log("delete Error" + e);
  }
};

export const findRooms = async (user: UserDto): Promise<RoomDto[] | null> => {
  let where = {};
  if (user.role === "nurse") {
    //간호사 -> 만든 방, 호스트인 방, 초대받은 방
    where = {
      OR: [
        {
          creatorid: user.id,
        },
        {
          Host: {
            some: {
              userid: user.id,
            },
          },
        },
        {
          Invite: {
            some: {
              userid: user.id,
            },
          },
        },
      ],
    };
  } else if (user.role === "doctor") {
    // 의사 -> 호스트인 방, 초대받은 방
    where = {
      OR: [
        {
          Host: {
            some: {
              userid: user.id,
            },
          },
        },
        {
          Invite: {
            some: {
              userid: user.id,
            },
          },
        },
      ],
    };
  } else if (user.role === "patient") {
    // 환자 -> 초대받은 방
    where = {
      OR: [
        {
          Invite: {
            some: {
              userid: user.id,
            },
          },
        },
      ],
    };
  }

  const rooms = await client.room.findMany({
    where: {
      AND: [
        where,
        { OR: [{ flag: RoomFlag.OPENED }, { flag: RoomFlag.SCHEDULED }] },
      ],
    },
    orderBy: {
      openat: "desc", // Replace 'createdAt' with the field you want to sort by
    },
  });

  return rooms.map((room) => {
    return RoomDto.fromEntity(room);
  });
};

export const findRoomById = async (roomId: string): Promise<RoomDto | null> => {
  const room = await client.room.findUnique({
    where: {
      id: roomId,
    },
  });

  if (room == null) return null;

  return RoomDto.fromEntity(room);
};

export const updateAllCallRecordOfRoom = async (
  roomId: string
): Promise<boolean> => {
  const newExitAt = new Date();
  const updatedRecords = await client.callRecord.updateMany({
    where: {
      AND: [{ roomid: roomId }, { exitat: null }],
    },
    data: {
      exitat: newExitAt,
    },
  });

  return updatedRecords != undefined;
};

export const checkRoomOpened = async (): Promise<boolean | null> => {
  const presentTime = new Date(); // 비교할 현재 시간
  console.log("check Room Opened :: " + presentTime.toISOString());
  const result = await client.room.updateMany({
    where: {
      AND: [
        { deletedat: null },
        { flag: RoomFlag.SCHEDULED },
        { openat: { lte: presentTime } },
      ],
    },
    data: {
      flag: RoomFlag.OPENED,
    },
  });

  return !!result;
};

export const checkRoomClosed = async (): Promise<boolean | null> => {
  const presentTime = new Date(); // 비교할 현재 시간
  console.log("check room closed :: " + presentTime.toISOString());

  const result = await client.room.updateMany({
    where: {
      AND: [
        { NOT: { deletedat: null } },
        { flag: RoomFlag.OPENED },
        { deletedat: { lte: presentTime } },
      ],
    },
    data: {
      flag: RoomFlag.CLOSED,
    },
  });

  return !!result;
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
