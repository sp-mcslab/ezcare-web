import { NextApiRequest, NextApiResponse } from "next";
import { RoomState } from "@prisma/client";
import {
  checkRoomClosed,
  checkRoomOpened,
  createRoom,
  deleteRoomReq,
  updateAllCallRecordOfRoom,
} from "@/repository/room.repository";
import { createHost, findUserHostByRoomId } from "@/repository/host.repository";
import { getIdFromToken } from "@/utils/JwtUtil";
import { findRooms } from "@/repository/room.repository";
import { findUserById } from "@/repository/user.repository";
import {
  createInvitation,
  findInvitedUsersByRoomId,
} from "@/repository/invite.repository";
import roomListService from "@/service/roomListService";

const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";

export const postRoomNow = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // 진료실 생성
  const { name, invitedUserIds, hostUserIds, baseUrl } = req.body;

  const creatorId = getIdFromToken(
    req.headers["x-ezcare-session-token"] as string,
    secretKey
  ); // 방 생성자의 id get.

  const currentTime = new Date();
  currentTime.setSeconds(0, 0);

  //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
  if (creatorId == null) {
    res.status(401).end();
    return;
  }

  if (baseUrl == undefined) {
    console.log("base url is undefined");
    res.status(404).end();
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
      RoomState.OPENED
    );

    await createHost(room.id, creatorId);

    const roomUrl = (baseUrl as string) + room.id;

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

export const postRoomLater = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // 진료실 생성
  const { name, openAt, invitedUserIds, hostUserIds, baseUrl } = req.body;

  const creatorId = getIdFromToken(
    req.headers["x-ezcare-session-token"] as string,
    secretKey
  ); // 방 생성자의 id get.

  let flag: RoomState = RoomState.SCHEDULED; // Use the enum values

  const currentTime = new Date();
  currentTime.setSeconds(0, 0);
  const openTime = new Date(openAt);

  if (openTime.getTime() == currentTime.getTime()) flag = RoomState.OPENED;

  console.log("진료실 open 예정 시간은 : " + openTime + " 입니다. ");
  console.log("current Time : " + currentTime + "/ open Time : " + openTime);

  //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
  if (creatorId == null) {
    res.status(401).end();
    return;
  }

  if (baseUrl == undefined) {
    res.status(404).end();
    return;
  }
  //openAt이 createdAt보다 과거인 경우
  if (openTime.getTime() < currentTime.getTime()) {
    res.status(404);
    res.json({ message: "openAt이 현재보다 과거일 수 없습니다." });
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
      flag
    );

    await createHost(room.id, creatorId);

    const roomUrl = (baseUrl as string) + room.id;

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

export const deleteRoom = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if ((await deleteRoomReq(req.query.roomId as string)) == undefined)
      throw "존재하지 않는 진료실입니다.";

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

export const getRooms = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const schedule = require("node-schedule");
    const job = schedule.scheduleJob("1 * * * * *", function () {
      roomListService.checkAndUpdateFlag();
    });

    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.
    if (userId == null) {
      res.status(401).end();
      return;
    }

    const user = await findUserById(userId);
    if (user == null) {
      res.status(401).end();
      return;
    }

    const rooms = await findRooms(user);
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

export const getHostById = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.

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
      if (host.userid == userId) {
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

export const getInvitedUsersByRoomId = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.

    const roomId = req.query.roomId;

    if (roomId == null) {
      res.status(401).end();
      return;
    }

    const invitedUsers = await findInvitedUsersByRoomId(roomId as string);
    if (invitedUsers == null) {
      res.status(401).end();
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

export const postInvitation = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const roomId = req.query.roomId;
    if (roomId == null) {
      res.status(400).end();
      return;
    }

    const { userId } = req.body;
    if (userId == null) {
      res.status(401).end();
      return;
    }

    console.log(
      roomId + " 번 방에 회원번호 " + userId + " 님이 초대되었습니다."
    );

    const invitedUsers = await createInvitation(
      roomId as string,
      userId as string
    );
    if (invitedUsers == null) {
      res.status(400).end();
      return;
    }

    res.status(200);
    res.json({
      message: "초대 목록에 추가되었습니다..",
      // data: { invitedUsers: invitedUsers },
    });
    return;
  } catch (e) {
    res.status(404);
    res.json({ message: "초대 목록애 추가되지 않았습니다." });
    return;
  }
};

export const getRoomAvailability = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // try {
  //   const roomId = req.query.roomId;
  //   if (typeof roomId !== "string") {
  //     res.status(500).end("path에 roomId가 존재하지 않습니다.");
  //     return;
  //   }
  //   const requestBody = new RoomAvailabilityRequestBody(req.body.userId);
  //   const userId = requestBody.userId;
  //   const room = await findRoomById(roomId);
  //
  //   if (room == null) {
  //     res.status(404).end(new ResponseBody({ message: NO_ROOM_ERROR_MESSAGE }));
  //     return;
  //   }
  //
  //   if (room.master_id !== userId && (await isRoomFull(room.id))) {
  //     res
  //       .status(400)
  //       .end(new ResponseBody({ message: ROOM_IS_FULL_ERROR_MESSAGE }));
  //     return;
  //   }
  //
  //   if (await isUserBlockedAtRoom(userId, room.id)) {
  //     res
  //       .status(400)
  //       .end(
  //         new ResponseBody({ message: INVALID_ROOM_PASSWORD_ERROR_MESSAGE })
  //       );
  //     return;
  //   }
  //
  //   res.status(200).end(new ResponseBody({ message: ROOM_AVAILABLE_MESSAGE }));
  // } catch (e) {
  //   if (typeof e === "string") {
  //     res.status(400).end(e);
  //     return;
  //   }
  //   console.log("ERROR: ", e);
  //   res
  //     .status(500)
  //     .end(new ResponseBody({ message: SERVER_INTERNAL_ERROR_MESSAGE }));
  // }
};

export const getRecentRooms = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  // try {
  //   if (typeof req.query.userId !== "string") {
  //     res.status(400).send(new ResponseBody({ message: REQUEST_QUERY_ERROR }));
  //     return;
  //   }
  //   const roomsGetBody = new RecentRoomsGetRequest(req.query.userId);
  //   const result = await findRecentRooms(roomsGetBody.userId);
  //   res.status(201).json(
  //     new ResponseBody({
  //       data: result,
  //       message: GET_RECENT_ROOM_SUCCESS,
  //     })
  //   );
  // } catch (e) {
  //   if (typeof e === "string") {
  //     res.status(400).send(new ResponseBody({ message: e }));
  //     return;
  //   }
  //   res
  //     .status(500)
  //     .send(new ResponseBody({ message: SERVER_INTERNAL_ERROR_MESSAGE }));
  // }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export const postRoomThumbnail = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse
) => {
  // try {
  //   const multerUpload = multer({
  //     storage: multer.diskStorage({
  //       filename: function (req, file, callback) {
  //         const ext = path.extname(file.originalname);
  //         callback(null, "test" + ext);
  //       },
  //     }),
  //     limits: { fileSize: MAX_IMAGE_BYTE_SIZE },
  //   });
  //   await runMiddleware(req, res, multerUpload.single("roomThumbnail"));
  //   const file = req.file;
  //   const others = req.body;
  //   const signedUrl: string = await multipartUploader(
  //     "rooms/" + others.roomId + ".png",
  //     file.path
  //   );
  //
  //   res.status(201).send(
  //     new ResponseBody({
  //       message: SET_ROOM_THUMBNAIL_SUCCESS,
  //       data: signedUrl,
  //     })
  //   );
  // } catch (e) {
  //   if (e instanceof MulterError && e.code === "LIMIT_FILE_SIZE") {
  //     res
  //       .status(400)
  //       .send(new ResponseBody({ message: IMAGE_SIZE_EXCEED_MESSAGE }));
  //     return;
  //   }
  //   if (typeof e === "string") {
  //     res.status(400).send(new ResponseBody({ message: e }));
  //     return;
  //   }
  //   res
  //     .status(500)
  //     .send(new ResponseBody({ message: SERVER_INTERNAL_ERROR_MESSAGE }));
  //   return;
  // }
};
