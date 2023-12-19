import { Room } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";
import { RoomDto } from "@/dto/RoomDto";

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

  // RoomDTO -> CallLogDTO
  public static fromRoomDto = (
    room: RoomDto,
    participants: CallLogItemDto[] | null
  ): CallLogDto => {
    return new CallLogDto({
      roomId: room.id,
      openAt: room.openAt,
      deletedAt: room.deletedAt,
      creatorId: room.creatorId,
      participants: participants,
    });
  };
}
