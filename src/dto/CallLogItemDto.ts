import { CallRecord } from "@prisma/client";

export class CallLogItemDto {
  public readonly userId: string;
  public readonly joinAt: Date;
  public readonly exitAt: Date | null;

  constructor({
    userId,
    joinAt,
    exitAt,
  }: {
    userId: string;
    joinAt: Date;
    exitAt: Date | null;
  }) {
    this.userId = userId;
    this.joinAt = joinAt;
    this.exitAt = exitAt;
  }

  // Entity -> DTO
  public static fromEntity = (callRecordEntity: CallRecord): CallLogItemDto => {
    return new CallLogItemDto({
      userId: callRecordEntity.userid,
      joinAt: callRecordEntity.joinat,
      exitAt: callRecordEntity.exitat,
    });
  };
}
