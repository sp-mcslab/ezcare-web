//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import {
  postOperationLog,
  getOperationLog,
} from "@/controller/admin.controller";

export default async function OperationLogHansdler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getOperationLog(req, res);
      break;
    case "POST":
      await postOperationLog(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
