import si from "systeminformation";

export class HealthLogDto {
  public readonly cpu: {
    speed: string;
    cores: string;
    processors: string;
    loadPercentage: string;
  };
  public readonly memory: {
    totalByte: string;
    usageByte: string;
    availableByte: string;
  };
  public readonly disk: {
    diskInfo: string;
    totalByte: string;
    usageByte: string;
    availableByte: string;
  }[];
  public readonly network: {
    sendBytes: string;
    sendDropped: string;
    sendErrors: string;
    receiveBytes: string;
    receiveDropped: string;
    receiveErrors: string;
  }[];

  constructor({
    cpu,
    memory,
    disk,
    network,
  }: {
    cpu: {
      speed: string;
      cores: string;
      processors: string;
      loadPercentage: string;
    };
    memory: { totalByte: string; usageByte: string; availableByte: string };
    disk: {
      diskInfo: string;
      totalByte: string;
      usageByte: string;
      availableByte: string;
    }[];
    network: {
      sendBytes: string;
      sendDropped: string;
      sendErrors: string;
      receiveBytes: string;
      receiveDropped: string;
      receiveErrors: string;
    }[];
  }) {
    this.cpu = cpu;
    this.memory = memory;
    this.disk = disk;
    this.network = network;
  }

  // RoomEntity -> CallLogDTO
  public static fromDataEntity = (
    cpu: {
      speed: string;
      cores: string;
      processors: string;
      loadPercentage: string;
    },
    memory: { totalByte: string; usageByte: string; availableByte: string },
    disk: {
      diskInfo: string;
      totalByte: string;
      usageByte: string;
      availableByte: string;
    }[],
    network: {
      sendBytes: string;
      sendDropped: string;
      sendErrors: string;
      receiveBytes: string;
      receiveDropped: string;
      receiveErrors: string;
    }[]
  ): HealthLogDto => {
    return new HealthLogDto({
      cpu: cpu,
      memory: memory,
      disk: disk,
      network: network,
    });
  };
}
