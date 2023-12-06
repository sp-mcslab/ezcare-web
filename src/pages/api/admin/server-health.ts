//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getServerHealth } from "@/controller/admin.controller";

export default async function CallTimeHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getServerHealth(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
