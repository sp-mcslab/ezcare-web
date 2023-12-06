import client from "prisma/client";
import { Invite } from "@prisma/client";
import { InviteDto } from "@/dto/InviteDto";

export const findInvitedUsersByRoomId = async (
  roomid: string
): Promise<Invite[] | null> => {
  try {
    return await client.invite.findMany({
      where: {
        roomid: roomid,
      },
    });
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
      },
    });
    return InviteDto.fromEntity(inviteEntity);
  } catch (e) {
    console.log("create host Error " + e);
    return null;
  }
};
