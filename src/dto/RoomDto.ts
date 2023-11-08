import { Room } from "@prisma/client";

export class RoomDto {
  public readonly id: string;
  public readonly name: string;
  public readonly flag: boolean | null;

  constructor({ id, name, flag }: { id: string; name: string; flag: boolean | null; }) { // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.id = id;
    this.name = name;
    this.flag = flag;
  }

  //Entity -> DTO
  public static fromEntity = (roomEntity: Room): RoomDto => {
    return new RoomDto({ id: roomEntity.id, name: roomEntity.name, flag: roomEntity.flag });
  };
}