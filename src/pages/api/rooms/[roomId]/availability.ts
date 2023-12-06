import { NextApiRequest, NextApiResponse } from "next";

export default async function availabilityHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  console.log("availability: ", req);

  switch (method) {
    case "GET":
      break;
    default:
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
