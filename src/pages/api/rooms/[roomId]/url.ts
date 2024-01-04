//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getUrlById } from "@/controller/room.controller";

export default async function urlHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getUrlById(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
