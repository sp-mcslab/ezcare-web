//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { tenant } from "@/controller/tenant.controller";

//TODO : 삭제
export default async function tenantHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await tenant(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
