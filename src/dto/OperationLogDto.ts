import { Room } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";
import { RoomDto } from "@/dto/RoomDto";

export class OperationLogDto {
  public readonly roomId: string;
  public readonly openAt: Date;
  public readonly deletedAt: Date | null;
  public readonly creatorId: string;
  public readonly operations: OperationLogItemDto[] | null;

  constructor({
    roomId,
    openAt,
    deletedAt,
    creatorId,
    operations,
  }: {
    roomId: string;
    openAt: Date;
    deletedAt: Date | null;
    creatorId: string;
    operations: OperationLogItemDto[] | null;
  }) {
    this.roomId = roomId;
    this.openAt = openAt;
    this.deletedAt = deletedAt;
    this.creatorId = creatorId;
    this.operations = operations;
  }

  // RoomDto -> OperationLogDto
  public static fromRoomDto = (
    room: RoomDto,
    operations: OperationLogItemDto[] | null
  ): OperationLogDto => {
    return new OperationLogDto({
      roomId: room.id,
      openAt: room.openAt,
      deletedAt: room.deletedAt,
      creatorId: room.creatorId,
      operations: operations,
    });
  };
}
