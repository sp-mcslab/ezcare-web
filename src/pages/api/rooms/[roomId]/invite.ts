import { NextApiRequest, NextApiResponse } from "next";
import {
  postInvitation,
  getInvitedUsersByRoomId,
} from "@/controller/room.controller";

export default async function hostHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getInvitedUsersByRoomId(req, res);
      break;
    case "POST":
      await postInvitation(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
