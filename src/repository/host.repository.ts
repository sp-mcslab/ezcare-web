import client from "image/client";
import { Host } from "@prisma/client";
import { HostDto } from "@/dto/HostDto";

const HOSPITAL_CODE = "H001";
const TENANT_CODE = "H0013";

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
  userId: string,
  hospitalCode: string,
  tenantCode: string
): Promise<HostDto | null> => {
  try {
    const hostEntity = await client.host.create({
      data: {
        roomid: roomId,
        userid: userId,
        hospitalcode: hospitalCode,
        tenantcode: tenantCode,
      },
    });
    return HostDto.fromEntity(hostEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
