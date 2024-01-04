import { NextApiRequest, NextApiResponse } from "next";
import { RoomFlag } from "@prisma/client";
import {
  checkRoomClosed,
  checkRoomOpened,
  createRoom,
  deleteRoomReq,
  findRoomById,
  updateAllCallRecordOfRoom,
} from "@/repository/room.repository";
import { createHost, findUserHostByRoomId } from "@/repository/host.repository";
import { findRooms } from "@/repository/room.repository";
import {
  createInvitation,
  findInvitedUsersByRoomId,
} from "@/repository/invite.repository";
import roomListService from "@/service/roomListService";

// 즉시 방 생성
export const postRoomNow = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"];
  // 진료실 생성
  const { name, creatorId, invitedUserIds, hostUserIds } = req.body;

  //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
  if (creatorId == null) {
    res.status(401).end();
    return;
  }

  const currentTime = new Date();
  currentTime.setSeconds(0, 0);

  const hospitalCode = req.headers["hospital-code"] as string;
  if (!hospitalCode) {
    res.status(401).end();
    return;
  }

  try {
    const room = await createRoom(
      creatorId,
      name,
      currentTime,
      currentTime,
      invitedUserIds,
      hostUserIds,
      hospitalCode,
      RoomFlag.OPENED
    );

    await createHost(room.id, creatorId, hospitalCode);

    const roomUrl = `${protocol}://${host}/rooms/${room.id}`;

    res.status(201);
    res.json({
      message: "진료실 개설을 성공했습니다.",
      data: {
        room,
        roomUrl,
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

// 예약 방 생성
export const postRoomLater = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"];

  // 진료실 생성
  const { name, creatorId, openAt, invitedUserIds, hostUserIds } = req.body;

  //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
  if (creatorId == null) {
    res.status(401).end();
    return;
  }

  let flag: RoomFlag = RoomFlag.SCHEDULED; // Use the enum values

  const currentTime = new Date();
  currentTime.setSeconds(0, 0);
  const openTime = new Date(openAt);

  if (openTime.getTime() == currentTime.getTime()) flag = RoomFlag.OPENED;

  console.log("진료실 open 예정 시간은 : " + openTime + " 입니다. ");
  console.log("current Time : " + currentTime + "/ open Time : " + openTime);

  //openAt이 createdAt보다 과거인 경우
  if (openTime.getTime() < currentTime.getTime()) {
    res.status(404);
    res.json({ message: "openAt이 현재보다 과거일 수 없습니다." });
    return;
  }

  const hospitalCode = req.headers["hospital-code"] as string;
  if (!hospitalCode) {
    res.status(401).end();
    return;
  }

  try {
    const room = await createRoom(
      creatorId,
      name,
      currentTime,
      openAt,
      invitedUserIds,
      hostUserIds,
      hospitalCode,
      flag
    );

    await createHost(room.id, creatorId, hospitalCode);

    const roomUrl = `${protocol}://${host}/rooms/${room.id}`;

    res.status(201);
    res.json({
      message: "진료실 개설을 성공했습니다.",
      data: {
        room,
        roomUrl,
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

// 방 삭제
export const deleteRoom = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if ((await deleteRoomReq(req.query.roomId as string)) == undefined)
      throw "존재하지 않는 진료실입니다.";

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // 진료실에 남아있던 사용자들 exitat 모두 갱신
    const result = updateAllCallRecordOfRoom(req.query.roomId as string);

    if (!result) {
      console.log("error : 404");
      res.status(404);
      res.json({
        message: "사용자 퇴장 정보 갱신에 실패하였습니다.",
      });
      return;
    }
    res.status(204);
    res.json({
      message: "진료실을 삭제했습니다.",
    });
    return;
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:404", e);
      res.status(404);
      res.json({
        message: "존재하지 않는 진료실입니다.",
      });
      return;
    }
    console.log("error: 500, ", e);
    res.status(500);
  }
};

// 방 목록 조회
export const getRooms = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const schedule = require("node-schedule");
    const job = schedule.scheduleJob("1 * * * * *", function () {
      roomListService.checkAndUpdateFlag();
    });

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const userId = req.query.userId;
    if (userId == null) {
      res.status(401).end();
      return;
    }

    const rooms = await findRooms(userId as string, hospitalCode);
    res.status(200);
    res.json({
      message: "진료실 목록이 조회되었습니다.",
      data: rooms,
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

// 방 아이디로 방 조회
export const getRoomById = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    // room 조회
    const room = await findRoomById(req.query.roomId as string);

    if (room == null) {
      res.status(404);
      res.json({
        message: "존재하지 않는 진료실입니다.",
      });
      return;
    }

    res.status(200);
    res.json({
      message: "해당 진료실이 조회되었습니다.",
      data: room,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(404);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

// 진료실 상태 확인
export const checkRoomFlag = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    checkRoomOpened();
    checkRoomClosed();

    res.status(200);
    res.json({ message: "flag 검사를 완료하였습니다.", data: false });
    return;
  } catch (e) {
    res.status(404);
    res.json({ message: "flag 검사 중 오류가 발생했습니다." });
    return;
  }
};

// 호스트 조회
export const getHostById = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    // 사용자의 id get.
    const userId = req.query.userId;

    //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
    if (userId == null) {
      res.status(401).end();
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    //호스트 조회
    const roomId = req.query.roomId;

    if (roomId == null) {
      res.status(401).end();
      return;
    }

    const hosts = await findUserHostByRoomId(roomId as string);
    if (hosts == null) {
      res.status(401).end();
      return;
    }

    for (const host of hosts) {
      if (host.userid == (userId as string)) {
        res.status(200);
        res.json({ message: "호스트 권한을 가지고 있습니다.", data: true });
        return;
      }
    }

    res.status(200);
    res.json({ message: "호스트 권한을 가지고 있지 않습니다.", data: false });
    return;
  } catch (e) {
    res.status(404);
    res.json({ message: "호스트 권한이 조회되지 않았습니다." });
    return;
  }
};

// 초대 목록 조회
export const getInvitedUsersByRoomId = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const roomId = req.query.roomId;

    if (roomId == null) {
      res.status(404);
      res.json({ message: "존재하지 않는 진료실입니다." });
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const invitedUsers = await findInvitedUsersByRoomId(roomId as string);
    if (invitedUsers == null) {
      res.status(404).end();
      return;
    }

    res.status(200);
    res.json({
      message: "초대 목록이 조회되었습니다.",
      data: { invitedUsers: invitedUsers },
    });
    return;
  } catch (e) {
    res.status(404);
    res.json({ message: "초대 목록이 조회되지 않았습니다." });
    return;
  }
};

// 초대 신청
export const postInvitation = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const roomId = req.query.roomId;
    if (roomId == null) {
      res.status(404);
      res.json({ message: "존재하지 않는 진료실입니다." });
      return;
    }

    const { userId } = req.body;
    if (userId == null) {
      res.status(401).end();
      return;
    }

    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log(
      roomId + " 번 방에 회원번호 " + userId + " 님이 초대되었습니다."
    );

    const invitedUsers = await createInvitation(
      roomId as string,
      userId as string,
      hospitalCode
    );
    if (invitedUsers == null) {
      res.status(400).end();
      return;
    }

    res.status(200);
    res.json({
      message: "초대 목록에 추가되었습니다.",
      // data: { invitedUsers: invitedUsers },
    });
    return;
  } catch (e) {
    res.status(404);
    res.json({ message: "초대 목록에 추가되지 않았습니다." });
    return;
  }
};

// 진료실 url 조회
export const getUrlById = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["host"];

    const roomId = req.query.roomId;

    if (roomId == null) {
      res.status(404);
      res.json({ message: "존재하지 않는 진료실입니다." });
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);
    const roomUrl = `${protocol}://${host}/rooms/${roomId}`;

    res.status(200);
    res.json({
      message: "진료실 url 이 조회되었습니다.",
      data: roomUrl,
    });
    return;
  } catch (e) {
    console.error(e);
    res.status(400);
    res.json({ message: "진료실 url 이 조회되지 않았습니다." });
    return;
  }
};
