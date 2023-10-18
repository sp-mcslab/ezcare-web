//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getCallLog, postCallLog } from "@/controller/admin.controller";

export default async function CallLogHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getCallLog(req, res);
      break;
    case "POST":
      await postCallLog(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
