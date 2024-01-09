import client from "prisma/client";
import { Invite } from "@prisma/client";
import { InviteDto } from "@/dto/InviteDto";

/**
 * roomId를 사용해 초대된 사용자 리스트 조회
 */
export const findInvitedUsersByRoomId = async (
  roomid: string
): Promise<InviteDto[] | null> => {
  try {
    const inviteEntity = await client.invite.findMany({
      where: {
        roomid: roomid,
      },
    });

    return inviteEntity.map((invitedUser) => InviteDto.fromEntity(invitedUser));
  } catch (e) {
    console.log(e);
    return null;
  }
};

/**
 * 사용자 정보와 진료실 정보를 invite 테이블에 저장
 */
export const createInvitation = async (
  roomId: string,
  userId: string,
  hospitalCode: string
): Promise<InviteDto | null> => {
  try {
    const inviteEntity = await client.invite.create({
      data: {
        roomid: roomId,
        userid: userId,
        hospitalcode: hospitalCode,
      },
    });
    return InviteDto.fromEntity(inviteEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
