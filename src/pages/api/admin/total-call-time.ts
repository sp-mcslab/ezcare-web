//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import {
  getCallLog,
  getTotalCallTime,
  postCallLog,
} from "@/controller/admin.controller";

export default async function CallTimeHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getTotalCallTime(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
