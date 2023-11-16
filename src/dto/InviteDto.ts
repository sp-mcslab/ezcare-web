import { Invite } from "@prisma/client";

export class InviteDto {
  public readonly roomId: string;
  public readonly userId: string;

  constructor({ roomId, userId }: { roomId: string; userId: string }) {
    this.roomId = roomId;
    this.userId = userId;
  }

  //Entity -> DTO
  public static fromEntity = (inviteEntity: Invite): InviteDto => {
    return new InviteDto({
      roomId: inviteEntity.roomid,
      userId: inviteEntity.userid,
    });
  };
}
