import { Host } from "@prisma/client";

export class HostDto {
  public readonly roomId: string;
  public readonly userId: string;

  constructor({ roomId, userId }: { roomId: string; userId: string }) {
    // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.roomId = roomId;
    this.userId = userId;
  }

  //Entity -> DTO
  public static fromEntity = (hostEntity: Host): HostDto => {
    return new HostDto({
      roomId: hostEntity.roomid,
      userId: hostEntity.userid,
    });
  };
}
