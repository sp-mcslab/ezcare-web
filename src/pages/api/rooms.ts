import { NextApiRequest, NextApiResponse } from "next";
import { getRooms, postRoom } from "@/controller/room.controller";
import schedule from "node-schedule";
import roomService from "@/service/room.service";

export default async function roomHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getRooms(req, res);
      break;
    case "POST":
      await postRoom(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
