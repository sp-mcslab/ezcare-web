//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getOnlineUsers } from "@/controller/admin.controller";

export default async function OnlineUsersHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getOnlineUsers(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
