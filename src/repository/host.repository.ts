import client from "prisma/client";
import { uuid } from "uuidv4";
import { RoomDto } from "@/dto/RoomDto";
import { UserDto } from "@/dto/UserDto";
import { Host, Room } from "@prisma/client";
import { HostDto } from "@/dto/HostDto";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

const HOSPITAL_CODE = "A0013";
const TENANT_CODE = "A001";

export const findUserHostByRoomId = async (
  roomid: string
): Promise<Host[] | null> => {
  try {
    return await client.host.findMany({
      where: {
        roomid: roomid,
      },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const createHost = async (
  roomId: string,
  userId: string
): Promise<HostDto | null> => {
  try {
    const hostEntity = await client.host.create({
      data: {
        roomid: roomId,
        userid: userId,
      },
    });
    return HostDto.fromEntity(hostEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
