import { Room, RoomState } from "@prisma/client";

export class RoomDto {
  public readonly id: string;
  public readonly name: string;
  public readonly openAt: Date;
  public readonly creatorId: string;
  public readonly flag: RoomState | null;

  constructor({
    id,
    name,
    openAt,
    creatorId,
    flag,
  }: {
    id: string;
    name: string;
    openAt: Date;
    creatorId: string;
    flag: RoomState;
  }) {
    // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.id = id;
    this.name = name;
    this.openAt = openAt;
    this.creatorId = creatorId;
    this.flag = flag;
  }

  //Entity -> DTO
  public static fromEntity = (roomEntity: Room): RoomDto => {
    return new RoomDto({
      id: roomEntity.id,
      name: roomEntity.name,
      openAt: roomEntity.openat,
      creatorId: roomEntity.creatorid,
      flag: roomEntity.flag,
    });
  };
}
