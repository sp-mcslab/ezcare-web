//Service
import { NextApiRequest, NextApiResponse } from "next";
import {
  findAllRooms,
  findDayUsage,
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
  updateRecord,
} from "@/repository/callRecord.repository";
import { createOperationLog } from "@/repository/operationLog.repository";
import { OperationLogDto } from "@/dto/OperationLogDto";

/**
 * 모든 병원의 call-log를 조회한다
 * 병원 병 각 사용자의 입장과 퇴장을 표현한다.
 */
export const getCallLog = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const rooms = await findAllRooms(hospitalCode);

    if (!rooms || rooms.length === 0) {
      res.status(404).json({ message: "존재하지 않는 진료실입니다." });
      return;
    }

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

/**
 * 사용자가 진료실에 입장 및 퇴장 시, 해당 Record를 저장한다.
 */
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

/**
 * 사용자가 퇴장하거나, 강퇴당하는 등의 경우
 * 사용자의 퇴장을 기록하기 위해 Record를 갱신한다.
 */
export const updateCallLog = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    console.log("record updated ... ");
    let exitDate = req.body;

    if (exitDate == null) {
      exitDate = new Date();
    }

    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const updatedRecord = updateRecord(hospitalCode, exitDate.exitAt as Date);

    if (!updatedRecord) {
      res.status(404).json({
        message: "통화기록 갱신에 실패했습니다.",
      });
    }

    res.status(200).json({
      message: "통화기록이 갱신되었습니다.",
      data: updatedRecord,
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

/**
 * 병원 별, 전체 누적 진료 시간을 조회한다.
 * 병원의 오픈 시간(openat)과 삭제 시간(deletedat)을 비교하여 도출한 "활성화된 누적 시간"
 */
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

    const rooms = await findAllRooms(hospitalCode);

    console.log(rooms);

    if (!rooms || rooms.length === 0) {
      res.status(404).json({ message: "존재하지 않는 진료실입니다." });
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

/**
 * 진료실에서 사용자가 오퍼레이션 시도 시, 데이터 저장
 * 성공(SUCCESS) : 정상적으로 미디어를 제어한 경우
 * 실패(FAIL) : 미디어 제어 과정에서 오류가 발생하였거나, 실질적으로 작용되지 않은 경우 (이미 꺼진 비디오 끄는 오퍼레이션)
 */
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

/**
 * 진료실 내에서 시도된 사용자들의 모든 오퍼레이션들을 조회한다.
 * 성공(SUCCESS) : 정상적으로 미디어를 제어한 경우
 * 실패(FAIL) : 미디어 제어 과정에서 오류가 발생하였거나, 실질적으로 작용되지 않은 경우 (이미 꺼진 비디오 끄는 오퍼레이션)
 */
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
    const rooms = await findAllRooms(hospitalCode);

    if (!rooms || rooms.length === 0) {
      res.status(404).json({ message: "No rooms found" });
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

/**
 * 현재 진료실에 접속해 있는 유저들을 조회한다.
 * Record 상에 exitAt가 채워지지 않은 유저들을 조회한다.
 */
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

    res.status(200).json({
      message: "접속 중인 사용자를 조회했습니다.",
      data: onlineUsers,
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

/**
 * 병원 별, 일별 월별 년별 사용량을 조회한다.
 * "누적 생성 진료실 개수 (개)"와 "누적 진료실 활성 시간 (ms)" 제공
 */
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

    // 일별 월별 년별 사용량 조회
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

    if (hasDate) dayResult = await findDayUsage(date, hospitalCode); // 일별 누적 사용량
    if (hasMonth) monthResult = await findMonthUsage(date, hospitalCode); // 월별 누적 사용량
    if (hasYear) yearResult = await findYearUsage(date, hospitalCode); // 년별 누적 사용량

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

/**
 * 서버 헬스 체크 결과를 조회한다.
 */
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
    // npm install systeminformation,
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
