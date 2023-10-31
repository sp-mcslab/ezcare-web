//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getHostById } from "@/controller/room.controller";

export default async function hostHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getHostById(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
