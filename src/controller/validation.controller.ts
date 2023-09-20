//Service
import { NextApiRequest, NextApiResponse } from "next";
import { isValidToken } from "@/utils/JwtUtil";

export const validation = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";
  const tokenKey = "x-ezcare-session-token";
  const token = req.headers[tokenKey];

  try {
    const validation = isValidToken(token as string, secretKey);

    if (!validation) {
      res.status(401).end();
      return;
    }

    res.status(200).end();
  } catch (e) {
    console.log(e);
    res.status(500).end();
    return;
  }
};