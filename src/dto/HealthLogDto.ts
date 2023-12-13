import si from "systeminformation";

export class HealthLogDto {
  public readonly cpu: si.Systeminformation.CpuData;
  public readonly memory: si.Systeminformation.MemData;
  public readonly disk: si.Systeminformation.FsSizeData[];
  public readonly network: si.Systeminformation.NetworkStatsData[];

  constructor({
    cpu,
    memory,
    disk,
    network,
  }: {
    cpu: si.Systeminformation.CpuData;
    memory: si.Systeminformation.MemData;
    disk: si.Systeminformation.FsSizeData[];
    network: si.Systeminformation.NetworkStatsData[];
  }) {
    this.cpu = cpu;
    this.memory = memory;
    this.disk = disk;
    this.network = network;
  }

  // RoomEntity -> CallLogDTO
  public static fromDataEntity = (
    cpu: si.Systeminformation.CpuData,
    memory: si.Systeminformation.MemData,
    disk: si.Systeminformation.FsSizeData[],
    network: si.Systeminformation.NetworkStatsData[]
  ): HealthLogDto => {
    return new HealthLogDto({
      cpu: cpu,
      memory: memory,
      disk: disk,
      network: network,
    });
  };
}
