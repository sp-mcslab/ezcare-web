//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getPeriodUsage } from "@/controller/admin.controller";

export default async function PeriodUsageHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getPeriodUsage(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
