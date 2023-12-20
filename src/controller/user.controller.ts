import { NextApiRequest, NextApiResponse } from "next";
import { getIdFromToken } from "@/utils/JwtUtil";
import { findUserById, patchDisplayName } from "@/repository/user.repository";

const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";

// 사용자 아이디 조회
export const getUserData = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.
    if (userId == null) {
      res.status(401).end();
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const user = await findUserById(userId);
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
        displayname: user.displayname,
        name: user.name,
      },
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

// 아이디로 사용자 조회
export const getUserById = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const { userId } = req.body;
  try {
    const user = await findUserById(userId);

    if (user == null) {
      res.status(401).end();
      return;
    }

    res.status(200);
    res.json({
      message: "사용자 정보가 조회되었습니다.",
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const setDisplayName = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const { displayName } = req.body;
  try {
    const userId = getIdFromToken(
      req.headers["x-ezcare-session-token"] as string,
      secretKey
    ); // 사용자의 id get.
    if (userId == null) {
      res.status(401).end();
      return;
    }

    patchDisplayName(userId, displayName);

    res.status(200);
    res.json({
      message: "사용자의 display name을 설정했습니다.",
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};
