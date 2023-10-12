//Service
import { NextApiRequest, NextApiResponse } from "next";
import { findAllRooms } from "@/repository/room.repository";
import { CallLogDto } from "@/dto/CallLogDto";
import { findRecordByRoomId } from "@/repository/callRecord.repository";

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

//TODO: 입장/퇴장 시나리오에 CallRecord 삽입 로직 넣기 (개인별)
