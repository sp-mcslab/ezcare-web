import client from "image/client";
import { Invite } from "@prisma/client";
import { InviteDto } from "@/dto/InviteDto";

const HOSPITAL_CODE = "H001";
const TENANT_CODE = "H0013";

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

export const createInvitation = async (
  roomId: string,
  userId: string
): Promise<InviteDto | null> => {
  try {
    const inviteEntity = await client.invite.create({
      data: {
        roomid: roomId,
        userid: userId,
        hospitalcode: HOSPITAL_CODE,
        tenantcode: TENANT_CODE,
      },
    });
    return InviteDto.fromEntity(inviteEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
