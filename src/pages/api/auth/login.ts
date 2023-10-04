//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { login } from "@/controller/login.controller";

export default async function roomHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "POST":
      await login(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
