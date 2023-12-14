import { Room } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";
import { OperationLogItemDto } from "@/dto/OperationLogItemDto";

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

  // RoomEntity -> OperationLogDto
  public static fromRoomEntity = (
    roomEntity: Room,
    operations: OperationLogItemDto[] | null
  ): OperationLogDto => {
    return new OperationLogDto({
      roomId: roomEntity.id,
      openAt: roomEntity.createdat,
      deletedAt: roomEntity.deletedat,
      creatorId: roomEntity.creatorid,
      operations: operations,
    });
  };
}
