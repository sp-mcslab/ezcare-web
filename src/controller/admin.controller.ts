//Service
import { NextApiRequest, NextApiResponse } from "next";
import { findAllRooms } from "@/repository/room.repository";
import { CallLogDto } from "@/dto/CallLogDto";
import { HealthLogDto } from "@/dto/HealthLogDto";
import {
  createRecord,
  findOperationLogByRoomId,
  findRecordAllRoom,
} from "@/repository/callRecord.repository";
import si from "systeminformation";
import { Health } from "aws-sdk";
import { createOperationLog } from "@/repository/operationLog.repository";
import { OperationLogDto } from "@/dto/OperationLogDto";

export const getCallLog = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    const callLogPromises = rooms.map(async (room) => {
      const callRecords = await findRecordAllRoom(room.id);
      return CallLogDto.fromRoomEntity(room, callRecords);
    });

    const callLogs = await Promise.all(callLogPromises);

    res.status(200).json({
      message: "통화기록이 조회되었습니다.",
      data: callLogs,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const postCallLog = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    console.log("record save ... ");
    const record = req.body;

    const createdRecord = createRecord(
      record.userId,
      record.roomId,
      record.joinAt,
      record.exitAt
    );

    if (createdRecord == undefined) {
      res.status(404).json({
        message: "통화기록 저장에 실패했습니다.",
      });
    }

    res.status(200).json({
      message: "통화기록이 저장되었습니다.",
      data: createdRecord,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const getTotalCallTime = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    let totalCallTime = 0;
    rooms.map(async (room) => {
      if (room.createdat == null) {
        console.log("error:400 : 잘못된 데이터 형식입니다.");
        res.status(400).json({ message: "Bad Request" });
        return;
      }

      if (room.deletedat == null) {
        const presentTime = new Date();
        totalCallTime =
          totalCallTime + (presentTime.getTime() - room.openat.getTime());
      } else
        totalCallTime =
          totalCallTime + (room.deletedat.getTime() - room.openat.getTime());
    });

    res.status(200).json({
      message: "전체 진료시간을 조회했습니다. (밀리초)",
      data: totalCallTime,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const postOperationLog = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const operationLog = req.body;

    console.log(typeof operationLog);
    const createdRecord = createOperationLog(
      operationLog.roomId,
      operationLog.operator,
      operationLog.recipient,
      operationLog.transaction,
      operationLog.time as Date
    );

    if (createdRecord == undefined) {
      res.status(404).json({
        message: "오퍼레이션 기록 저장에 실패했습니다.",
      });
    }

    res.status(200).json({
      message: "오퍼레이션 기록이 저장되었습니다.",
      data: createdRecord,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const getOperationLog = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    const operationLogPromises = rooms.map(async (room) => {
      const operationLogs = await findOperationLogByRoomId(room.id);
      return OperationLogDto.fromRoomEntity(room, operationLogs);
    });

    const operationLogs = await Promise.all(operationLogPromises);

    res.status(200).json({
      message: "오퍼레이션 기록이 조회되었습니다.",
      data: operationLogs,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const getServerHealth = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // npm install os, npm install diskusage, npm install systeminformation,
    var si = require("systeminformation");

    const cpuInfo = await si.cpu();
    const cpuUsage = await si.currentLoad();
    const memoryInfo = await si.mem();
    const diskInfo = await si.fsSize();
    const networkInfo = await si.networkStats();

    const simplifiedDiskInfo = diskInfo.map(
      (disk: { fs: any; size: number; used: number; available: number }) => ({
        diskInfo: disk.fs,
        totalByte: disk.size,
        usageByte: disk.used,
        availableByte: disk.available,
      })
    );

    const simplifiedNetworkInfo = networkInfo.map(
      (network: {
        rx_bytes: number;
        rx_dropped: number;
        rx_errors: number;
        tx_bytes: number;
        tx_dropped: number;
        tx_errors: number;
      }) => ({
        sendBytes: network.rx_bytes,
        sendDropped: network.rx_dropped,
        sendErrors: network.rx_errors,

        receiveBytes: network.tx_bytes,
        receiveDropped: network.tx_dropped,
        receiveErrors: network.tx_errors,
      })
    );

    const healthLogs = await HealthLogDto.fromDataEntity(
      {
        speed: cpuInfo.speed,
        cores: cpuInfo.cores,
        processors: cpuInfo.processors,
        loadPercentage: cpuUsage.currentLoad,
      },
      {
        totalByte: memoryInfo.total,
        usageByte: memoryInfo.used,
        availableByte: memoryInfo.free,
      },
      simplifiedDiskInfo,
      simplifiedNetworkInfo
    );

    res.status(200).json({
      message: "서버 헬스 체크 성공하였습니다.",
      data: healthLogs,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};
