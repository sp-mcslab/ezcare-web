import { NextApiRequest, NextApiResponse } from "next";
import { postRoomLater } from "@/controller/room.controller";

export default async function roomHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "POST":
      await postRoomLater(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
