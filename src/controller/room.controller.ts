import { NextApiRequest, NextApiResponse } from "next";
import { createRoom } from "@/repository/room.repository";
import { getIdFromToken } from "@/utils/JwtUtil";


export const postRoom = async (req: NextApiRequest, res: NextApiResponse) => { // 진료실 생성
  const { name, openAt, invitedUserIds, hostUserIds } = req.body;

  const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";
  const creatorId = getIdFromToken(req.headers["x-ezcare-session-token"] as string, secretKey); // 방 생성자의 id get.
  const currentTime = new Date();

  //방 생성을 요청한 사용자의 토큰이 유효하지 않을 때.
  if (creatorId == null) {
    res.status(401).end();
    return;
  }

  //openAt이 createdAt보다 과거인 경우
  if (openAt < currentTime) {
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
      hostUserIds);

    res.status(201);
    res.json({
      "message": "진료실 개설을 성공했습니다.",
      "data": room,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res
      .status(500);
    return;
  }
};


export const getRoomAvailability = async (
  req: NextApiRequest,
  res: NextApiResponse,
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

export const getRooms = async (req: NextApiRequest, res: NextApiResponse) => {
  // try {
  //   if (typeof req.query.page !== "string") {
  //     res.status(400).send(new ResponseBody({ message: REQUEST_QUERY_ERROR }));
  //     return;
  //   }
  //   const roomsGetBody = new RoomsGetRequest(req.query.page);
  //   const result = await findRooms(roomsGetBody.pageNum);
  //   res.status(201).json(
  //     new ResponseBody({
  //       data: result,
  //       message: GET_ROOMS_SUCCESS,
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

export const getRecentRooms = async (
  req: NextApiRequest,
  res: NextApiResponse,
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

export const deleteRoom = async (req: NextApiRequest, res: NextApiResponse) => {
  // try {
  //   await deleteRoomReq(new RoomDeleteRequestBody(req.body.roomId));
  //   res.status(201).send(new ResponseBody({ message: ROOM_DELETE_SUCCESS }));
  // } catch (e) {
  //   if (typeof e === "string") {
  //     console.log("error:400", e);
  //     res.status(400).send(new ResponseBody({ message: e }));
  //     return;
  //   }
  //   console.log("error: 500");
  //   res
  //     .status(500)
  //     .send(new ResponseBody({ message: SERVER_INTERNAL_ERROR_MESSAGE }));
  //   return;
  // }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export const postRoomThumbnail = async (
  req: NextApiRequest & { [key: string]: any },
  res: NextApiResponse,
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