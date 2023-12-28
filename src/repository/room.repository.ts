import client from "prisma/client";
import { uuid } from "uuidv4";
import { RoomDto } from "@/dto/RoomDto";
import { UserDto } from "@/dto/UserDto";
import { Room, RoomFlag } from "@prisma/client";
import { getUsageOfDay } from "@/utils/UsageUtil";

export const findAllRooms = async (): Promise<RoomDto[] | undefined> => {
  try {
    const rooms = await client.room.findMany({
      orderBy: {
        createdat: "desc",
      },
    });

    return rooms.map((room) => RoomDto.fromEntity(room));
  } catch (e) {
    console.log("find All Rooms Error 500 " + e);
  }
};

import { Prisma } from "@prisma/client";

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
      creatorid: creatorId, // Updated field name
      name: name,
      createdat: createdAt,
      openat: openAt,
      deletedat: null,
      hospitalcode: hospitalCode, // Updated field name
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

export const findRooms = async (
  user: UserDto,
  hospital_code: string
): Promise<RoomDto[] | null> => {
  let where = {};
  if (user.role === "N") {
    //간호사 -> 호스트인 방, 초대받은 방
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
  } else if (user.role === "D") {
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
  } else if (user.role === "P") {
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

export const findDayUsage = async (
  date: Date
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

export const findMonthUsage = async (
  date: Date
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

  console.log("Start :: " + monthStart + " // " + "End :: " + monthLast);

  const data = await client.room.findMany({
    select: {
      openat: true,
      deletedat: true,
    },
    where: {
      AND: [
        { openat: { not: { gte: monthLast } } },
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

export const findYearUsage = async (
  date: Date
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

  console.log("Start :: " + yearStart + " // " + "End :: " + yearLast);

  const data = await client.room.findMany({
    select: {
      openat: true,
      deletedat: true,
    },
    where: {
      AND: [
        { openat: { not: { gte: yearLast } } },
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

export const findDayRoomTime = async (): Promise<number | null> => {
  const presentTime = new Date();

  const closeDeadLine = new Date(presentTime);
  closeDeadLine.setHours(0, 0, 0, 0);

  const openDeadLine = new Date(presentTime);
  openDeadLine.setDate(openDeadLine.getDate() + 1); // Set to the next day
  openDeadLine.setHours(0, 0, 0, 0);

  const count = await client.room.count({
    where: {
      AND: [
        { openat: { not: { gte: openDeadLine } } },
        { deletedat: { not: { lte: closeDeadLine } } },
      ],
    },
  });

  console.log("today's opened room count : " + count);

  return count;
};
