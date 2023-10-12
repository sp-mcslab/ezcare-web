import { Room } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

export class CallLogDto {
  public readonly roomId: string;
  public readonly openAt: Date;
  public readonly deletedAt: Date | null;
  public readonly creatorId: string;
  public readonly participants: CallLogItemDto[] | null;

  constructor({
    roomId,
    openAt,
    deletedAt,
    creatorId,
    participants,
  }: {
    roomId: string;
    openAt: Date;
    deletedAt: Date | null;
    creatorId: string;
    participants: CallLogItemDto[] | null;
  }) {
    this.roomId = roomId;
    this.openAt = openAt;
    this.deletedAt = deletedAt;
    this.creatorId = creatorId;
    this.participants = participants;
  }

  // RoomEntity -> CallLogDTO
  public static fromRoomEntity = (
    roomEntity: Room,
    participants: CallLogItemDto[] | null
  ): CallLogDto => {
    return new CallLogDto({
      roomId: roomEntity.id,
      openAt: roomEntity.createdat,
      deletedAt: roomEntity.deletedat,
      creatorId: roomEntity.creatorid,
      participants: participants,
    });
  };
}
