import client from "prisma/client";
import { uuid } from "uuidv4";
import { RoomDto } from "@/dto/RoomDto";
import { RoomFlag } from "@prisma/client";
import { getUsageOfDay } from "@/utils/UsageUtil";

/**
 * 모든 진료실을 생성일 기준 내림차순으로 (최신순) 정렬하여 조회한다.
 */
export const findAllRooms = async (
  hospitalCode: string
): Promise<RoomDto[] | undefined> => {
  try {
    const rooms = await client.room.findMany({
      where: {
        hospitalcode: hospitalCode,
      },
      orderBy: {
        createdat: "desc",
      },
    });

    return rooms.map((room) => RoomDto.fromEntity(room));
  } catch (e) {
    console.log("find All Rooms Error 500 " + e);
  }
};

/**
 * 진료실 생성
 */
export const createRoom = async (
  creatorId: string,
  name: string,
  createdAt: Date,
  openAt: Date,
  invitedUsers: string[],
  hostedUsers: string[],
  hospitalCode: string,
  flag: RoomFlag
): Promise<RoomDto> => {
  // 생성할 방의 고유 아이디 (기본키 id)
  const roomUniqueId = uuid();

  const roomEntity = await client.room.create({
    data: {
      id: roomUniqueId,
      creatorid: creatorId,
      name: name,
      createdat: createdAt,
      openat: openAt,
      deletedat: null,
      hospitalcode: hospitalCode,
      flag: flag,
      Host: {
        createMany: {
          data: hostedUsers.map((userid) => ({
            userid: userid,
            hospitalcode: hospitalCode,
          })),
        },
      },
      Invite: {
        createMany: {
          data: invitedUsers.map((userid) => ({
            userid: userid,
            hospitalcode: hospitalCode,
          })),
        },
      },
    },
  });

  return RoomDto.fromEntity(roomEntity);
};

/**
 * 특정 진료실 삭제
 */
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

/**
 * 병원 별, 진료실 목록 조회
 * 간호사 - 호스트인 방, 초대받은 방
 * 의사 - 호스트인 방 , 초대받은 방
 * 환자 - 초대받은 방
 */
export const findRooms = async (
  userId: string,
  hospital_code: string
): Promise<RoomDto[] | null> => {
  let where = {};
  const userRole = userId.substring(0, 1);
  console.log(userRole);
  if (userRole === "N") {
    //간호사 -> 호스트인 방, 초대받은 방
    where = {
      OR: [
        {
          creatorid: userId,
        },
        {
          Host: {
            some: {
              userid: userId,
            },
          },
        },
        {
          Invite: {
            some: {
              userid: userId,
            },
          },
        },
      ],
    };
  } else if (userRole === "D") {
    // 의사 -> 호스트인 방, 초대받은 방
    where = {
      OR: [
        {
          Host: {
            some: {
              userid: userId,
            },
          },
        },
        {
          Invite: {
            some: {
              userid: userId,
            },
          },
        },
      ],
    };
  } else if (userRole === "P") {
    // 환자 -> 초대받은 방
    where = {
      OR: [
        {
          Invite: {
            some: {
              userid: userId,
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
        { hospitalcode: hospital_code },
      ],
    },
    orderBy: {
      openat: "desc",
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

/**
 * 방이 삭제될 때, 방에 남아있던 모든 유저들을 퇴장 처리
 */
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

/**
 * OPEN 처리 해야할 방이 있는지 검사
 */
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

/**
 * CLOSE 처리 해야할 방이 있는지 검사
 */
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

/**
 * 병원 별, 일별 사용량을 조회한다.
 */
export const findDayUsage = async (
  date: Date,
  hospitalCode: string
): Promise<{
  dayCount: number;
  dayUsage: number;
} | null> => {
  let isToday = false;
  if (date.getDate() == new Date().getDate()) isToday = true;

  const today = new Date(date);

  const todayStart = new Date(today);
  todayStart.setDate(todayStart.getDate() - 1); // 오늘이 되기 전에 닫힌 것은 포함하지 않도록
  todayStart.setHours(23, 59, 59, 599);

  const todayLast = new Date(today);
  todayLast.setDate(todayLast.getDate() + 1); // 내일이 되어서야 열린 것은 포함하지 않도록
  todayLast.setHours(0, 0, 0, 0);

  const data = await client.room.findMany({
    select: {
      openat: true,
      deletedat: true,
    },
    where: {
      AND: [
        { openat: { not: { gte: todayLast } } },
        { hospitalcode: hospitalCode },
        {
          OR: [
            { deletedat: { equals: null } },
            { deletedat: { not: { lte: todayStart } } },
          ],
        },
      ],
    },
  });

  const dayCount = data.length;

  console.log("today's opened room count : " + dayCount);

  let dayUsage = 0;
  data.map((r) => {
    if (!isToday) today.setHours(23, 59, 59, 599);
    if (isToday) today.setTime(new Date().getTime());

    console.log(dayUsage);
    dayUsage += getUsageOfDay(
      today,
      todayStart,
      todayLast,
      r.openat,
      r.deletedat == null ? null : r.deletedat
    );
  });
  console.log("today's opened room time (ms) : " + dayUsage);

  return { dayCount, dayUsage };
};

/**
 * 병원 별, 월별 사용량을 조회한다.
 */
export const findMonthUsage = async (
  date: Date,
  hospitalCode: string
): Promise<{
  monthCount: number;
  monthUsage: number;
} | null> => {
  const thisMonth = new Date(date);

  const monthStart = new Date(thisMonth);
  monthStart.setDate(0);
  monthStart.setHours(23, 59, 59, 999);

  const monthLast = new Date(thisMonth);
  monthLast.setMonth(monthLast.getMonth() + 1, 1);
  monthLast.setHours(0, 0, 0, 0);

  const data = await client.room.findMany({
    select: {
      openat: true,
      deletedat: true,
    },
    where: {
      AND: [
        { openat: { not: { gte: monthLast } } },
        { hospitalcode: hospitalCode },
        {
          OR: [
            { deletedat: { equals: null } },
            { deletedat: { not: { lte: monthStart } } },
          ],
        },
      ],
    },
  });

  const monthCount = data.length;

  console.log("this month's opened room count : " + monthCount);

  let monthUsage = 0;
  data.map((r) => {
    let isThisMonth = false;
    const today = new Date();
    if (r.openat == today || r.deletedat == today) isThisMonth = true;

    if (!isThisMonth) today.setHours(23, 59, 59, 599);

    monthUsage += getUsageOfDay(
      today,
      monthStart,
      monthLast,
      r.openat,
      r.deletedat == null ? null : r.deletedat
    );
  });
  console.log("this month's opened room time (ms) : " + monthUsage);

  return { monthCount, monthUsage };
};

/**
 * 병원 별, 년별 사용량을 조회한다.
 */
export const findYearUsage = async (
  date: Date,
  hospitalCode: string
): Promise<{
  yearCount: number;
  yearUsage: number;
} | null> => {
  const thisYear = new Date(date);

  const yearStart = new Date(thisYear);
  yearStart.setFullYear(yearStart.getFullYear() - 1);
  yearStart.setMonth(11, 31);
  yearStart.setHours(23, 59, 59, 999);

  const yearLast = new Date(thisYear);
  yearLast.setFullYear(yearLast.getFullYear() + 1);
  yearLast.setMonth(0, 1);
  yearLast.setHours(0, 0, 0, 0);

  const data = await client.room.findMany({
    select: {
      openat: true,
      deletedat: true,
    },
    where: {
      AND: [
        { openat: { not: { gte: yearLast } } },
        { hospitalcode: hospitalCode },
        {
          OR: [
            { deletedat: { equals: null } },
            { deletedat: { not: { lte: yearStart } } },
          ],
        },
      ],
    },
  });

  const yearCount = data.length;

  console.log("this year's opened room count : " + yearCount);

  let yearUsage = 0;
  data.map((r) => {
    let isThisYear = false;
    const today = new Date();
    if (r.openat == today || r.deletedat == today) isThisYear = true;

    if (!isThisYear) today.setHours(23, 59, 59, 599);

    yearUsage += getUsageOfDay(
      today,
      yearStart,
      yearLast,
      r.openat,
      r.deletedat == null ? null : r.deletedat
    );
  });
  console.log("this year's opened room time (ms) : " + yearUsage);

  return { yearCount, yearUsage };
};
