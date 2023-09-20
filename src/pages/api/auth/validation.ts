//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { validation } from "@/controller/validation.controller";

export default async function validationHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;
  switch (method) {
    case "POST":
      await validation(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}