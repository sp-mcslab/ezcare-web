//라우팅
import { NextApiRequest, NextApiResponse } from "next";
import { getOption, updateOption } from "@/controller/hospital.controller";

export default async function userHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  switch (method) {
    case "GET":
      await getOption(req, res);
      break;
    case "PATCH":
      await updateOption(req, res);
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
