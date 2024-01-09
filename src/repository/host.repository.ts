import client from "prisma/client";
import { Host } from "@prisma/client";
import { HostDto } from "@/dto/HostDto";

/**
 * 특정 진료실의 host 리스트를 조회
 */
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

/**
 * 방 생성자와 호스트로 등록된 사용자들을 Host 테이블에 저장하여 권한 부여
 */
export const createHost = async (
  roomId: string,
  userId: string,
  hospitalCode: string
): Promise<HostDto | null> => {
  try {
    const hostEntity = await client.host.create({
      data: {
        roomid: roomId,
        userid: userId,
        hospitalcode: hospitalCode,
      },
    });
    return HostDto.fromEntity(hostEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
