import { NextApiRequest, NextApiResponse } from "next";
import { checkRoomFlag } from "@/controller/room.controller";

export default async function flagHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await checkRoomFlag(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
