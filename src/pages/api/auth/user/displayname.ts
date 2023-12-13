//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { setDisplayName } from "@/controller/user.controller";

export default async function userHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "PATCH":
      await setDisplayName(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
