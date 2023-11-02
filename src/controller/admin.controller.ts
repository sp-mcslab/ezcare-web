//Service
import { NextApiRequest, NextApiResponse } from "next";
import { findAllRooms } from "@/repository/room.repository";
import { CallLogDto } from "@/dto/CallLogDto";
import {
  createRecord,
  findRecordByRoomId,
} from "@/repository/callRecord.repository";

export const getCallLog = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const rooms = await findAllRooms();

    if (!rooms || rooms.length === 0) {
      res.status(400).json({ message: "No rooms found" });
      return;
    }

    const callLogPromises = rooms.map(async (room) => {
      const callRecords = await findRecordByRoomId(room.id);
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
      message: "통화기록이 조회되었습니다.",
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
