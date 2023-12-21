import { OperationLog, Transaction } from "@prisma/client";
import { CallLogItemDto } from "@/dto/CallLogItemDto";

export class OperationLogItemDto {
  public readonly roomId: string;
  public readonly operator: string;
  public readonly recipient: string;
  public readonly transaction: Transaction;
  public readonly time: Date;
  public readonly success: boolean;

  constructor({
    roomId,
    operator,
    recipient,
    transaction,
    time,
    success,
  }: {
    roomId: string;
    operator: string;
    recipient: string;
    transaction: Transaction;
    time: Date;
    success: boolean;
  }) {
    this.roomId = roomId;
    this.operator = operator;
    this.recipient = recipient;
    this.transaction = transaction;
    this.time = time;
    this.success = success;
  }

  // OperationLogEntity -> OperationLogDTO
  public static fromEntity = (
    operationLogEntity: OperationLog
  ): OperationLogItemDto => {
    return new OperationLogItemDto({
      roomId: operationLogEntity.roomid,
      operator: operationLogEntity.operator,
      recipient: operationLogEntity.recipient,
      transaction: operationLogEntity.transaction,
      time: operationLogEntity.time,
      success: operationLogEntity.success,
    });
  };
}
