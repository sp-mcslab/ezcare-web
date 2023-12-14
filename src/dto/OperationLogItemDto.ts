import { OperationLog, Transaction } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

export class OperationLogItemDto {
  public readonly roomId: string;
  public readonly operator: string;
  public readonly recipient: string;
  public readonly transaction: Transaction;
  public readonly time: Date;

  constructor({
    roomId,
    operator,
    recipient,
    transaction,
    time,
  }: {
    roomId: string;
    operator: string;
    recipient: string;
    transaction: Transaction;
    time: Date;
  }) {
    this.roomId = roomId;
    this.operator = operator;
    this.recipient = recipient;
    this.transaction = transaction;
    this.time = time;
  }

  // OperationLogEntity -> CallLogDTO
  public static fromEntity = (
    operationLogEntity: OperationLog
  ): OperationLogItemDto => {
    return new OperationLogItemDto({
      roomId: operationLogEntity.roomid,
      operator: operationLogEntity.operator,
      recipient: operationLogEntity.recipient,
      transaction: operationLogEntity.transaction,
      time: operationLogEntity.time,
    });
  };
}
