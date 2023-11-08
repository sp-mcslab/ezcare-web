import { NextApiRequest, NextApiResponse } from "next";
import { getIdFromToken } from "@/utils/JwtUtil";
import { findUserRoleById } from "@/repository/user.repository";

const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";

export const getUserId = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.
    if (userId == null) {
      res.status(401).end();
      return;
    }

    const user = await findUserRoleById(userId);
    if (user == null) {
      res.status(401).end();
      return;
    }

    res.status(200);
    res.json({
      message: "사용자 정보가 조회되었습니다.",
      data: {
        id: userId as string,
        role: user.role,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).end();
    return;
  }
};
