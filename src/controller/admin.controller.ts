//Service
import { NextApiRequest, NextApiResponse } from "next";
import {
  findAllRooms,
  findDayUsage,
  findDayRoomTime,
  findMonthUsage,
  findYearUsage,
} from "@/repository/room.repository";
import { CallLogDto } from "@/dto/CallLogDto";
import { HealthLogDto } from "@/dto/HealthLogDto";
import {
  createRecord,
  findOnlineUsers,
  findOperationLogByRoomId,
  findRecordAllRoom,
} from "@/repository/callRecord.repository";
import si from "systeminformation";
import { Health } from "aws-sdk";
import { createOperationLog } from "@/repository/operationLog.repository";
import { OperationLogDto } from "@/dto/OperationLogDto";
import { findTenant } from "@/repository/tenant.repository";
import { getUserById } from "@/controller/user.controller";
import { findUserById } from "@/repository/user.repository";

export const getCallLog = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const callLogPromises = rooms.map(async (room) => {
      const callRecords = await findRecordAllRoom(room.id);
      return CallLogDto.fromRoomDto(room, callRecords);
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

    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const createdRecord = createRecord(
      record.userId,
      record.roomId,
      record.joinAt,
      record.exitAt,
      hospitalCode
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
    // 병원 코드 검사
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // 전체 진료 시간 조회 -> 테넌트 별..
    const rooms = await findAllRooms();

    console.log(rooms);

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    let totalCallTime = 0;
    rooms.map(async (room) => {
      if (room.openAt == null) {
        console.log("error:400 : 잘못된 데이터 형식입니다.");
        res.status(400).json({ message: "Bad Request" });
        return;
      }

      if (room.deletedAt == null) {
        const presentTime = new Date();
        totalCallTime =
          totalCallTime + (presentTime.getTime() - room.openAt.getTime());
      } else
        totalCallTime =
          totalCallTime + (room.deletedAt.getTime() - room.openAt.getTime());
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

    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log(typeof operationLog);
    const createdRecord = createOperationLog(
      operationLog.roomId,
      operationLog.operator,
      operationLog.recipient,
      operationLog.transaction,
      operationLog.time as Date,
      operationLog.success,
      hospitalCode
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
    // 병원 코드 검사
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // operation log 조회
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    const operationLogPromises = rooms.map(async (room) => {
      const operationLogs = await findOperationLogByRoomId(room.id);
      return OperationLogDto.fromRoomDto(room, operationLogs);
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

export const getOnlineUsers = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // 병원 코드 검사
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // 접속 중인 사용자 조회
    const onlineUsers = await findOnlineUsers(hospitalCode);

    if (onlineUsers == null) {
      res.status(404).json({
        message: "접속 중인 사용자를 찾지 못했습니다.",
      });
      return;
    }

    let usersWithRolesObject: { [roomId: string]: object[] } = {};

    for (const [roomId, users] of Object.entries(onlineUsers)) {
      console.log("진료실 ID: " + roomId);

      const usersWithRoles = await Promise.all(
        users.map(async (userId) => {
          const user = await findUserById(userId);

          if (user == null) {
            res.status(404).end();
            return;
          }

          return { hospital_code: hospitalCode, userName: user.name };
        })
      );

      usersWithRolesObject[roomId] = usersWithRolesObject[roomId] || [];
      usersWithRolesObject[roomId] =
        usersWithRolesObject[roomId].concat(usersWithRoles);
    }

    res.status(200).json({
      message: "접속 중인 사용자를 조회했습니다.",
      data: usersWithRolesObject,
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

export const getPeriodUsage = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // 병원 코드 검사
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // 일별 월별 년별 사용량 통계 조회
    const currentdate = req.query.currentdate;

    if (!currentdate) {
      res.status(400).json({ message: "조회 날짜가 올바르지 않습니다." });
      return;
    }

    const dateArr = (currentdate as string).split("-");

    let hasYear = false;
    let hasMonth = false;
    let hasDate = false;
    console.log(dateArr);
    if (dateArr.length > 0) {
      hasYear = true;
      if (dateArr.length > 1) {
        hasMonth = true;
        if (dateArr.length > 2) {
          hasDate = true;
        }
      }
    }

    console.log(hasYear + " // " + hasMonth + " // " + hasDate);

    // 보내려는 값이 오늘/이번 달/이번 년 보다 미래면 보낼 수 없도록 예외처리
    const date = new Date(currentdate as string);

    console.log(date + " // " + new Date());
    if (date > new Date()) {
      res
        .status(400)
        .json({ message: "조회 날짜가 현재 날짜보다 미래일 수 없습니다." });
      return;
    }

    let dayResult = null;
    let monthResult = null;
    let yearResult = null;

    if (hasDate) dayResult = await findDayUsage(date); // 일별 누적 사용량
    if (hasMonth) monthResult = await findMonthUsage(date); // 월별 누적 사용량
    if (hasYear) yearResult = await findYearUsage(date); // 년별 누적 사용량

    const { dayCount, dayUsage } = dayResult || { dayCount: 0, dayUsage: 0 };
    const { monthCount, monthUsage } = monthResult || {
      monthCount: 0,
      monthUsage: 0,
    };
    const { yearCount, yearUsage } = yearResult || {
      yearCount: 0,
      yearUsage: 0,
    };

    if (
      dayCount < 0 ||
      dayUsage < 0 ||
      monthCount < 0 ||
      monthUsage < 0 ||
      yearCount < 0 ||
      yearUsage < 0
    ) {
      res
        .status(400)
        .json({ message: "일별 월별 년별 누적 사용량 조회에 실패했습니다." });
      return;
    }

    console.log("============= 일별 누적 사용량 ============");
    console.log(
      "활성화된 진료실 수 : " + dayCount + " / 누적 활성 시간 : " + dayUsage
    );
    console.log("============= 월별 누적 사용량 ============");
    console.log(
      "활성화된 진료실 수 : " + monthCount + " / 누적 활성 시간 : " + monthUsage
    );
    console.log("============= 년별 누적 사용량 ============");
    console.log(
      "활성화된 진료실 수 : " + yearCount + " / 누적 활성 시간 : " + yearUsage
    );

    res.status(200).json({
      message: "일별 월별 년별 통계를 조회했습니다.",
      data: {
        day: {
          roomCount: dayCount,
          "totalTime(ms)": dayUsage,
        },
        month: {
          roomCount: monthCount,
          "totalTime(ms)": monthUsage,
        },
        year: {
          roomCount: yearCount,
          "totalTime(ms)": yearUsage,
        },
      },
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
    // 병원 코드 검사
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // 서버 헬스 체크
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
