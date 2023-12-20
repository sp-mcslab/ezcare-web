//Service
import { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "@/utils/JwtUtil";
import { findUser } from "@/repository/login.repository";

export const login = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, password } = req.body; // 요청의 body에 담긴 사용자 정보 추출
  try {
    if (id == null || password == null) {
      res.status(404);
      res.json({ message: "ID 혹은 비밀번호가 입력되지 않았습니다." });
      return;
    }

    // 병원 코드 확인
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    console.log("hospital Code :: " + hospitalCode);

    const user = await findUser(id, password);

    // 로그인 실패 ; 사용자 정보 불일치
    if (user == null) {
      res.status(404);
      res.json({ message: "ID 혹은 비밀번호가 잘못되었습니다." });
      return;
    }

    // 로그인 성공 -> JWT 웹 토큰 생성
    const secretKey: string = process.env.JWT_SECRET_KEY || "jwt-secret-key";
    const token = signJWT(user.id, secretKey);

    //응답
    res.status(200);
    res.json({
      message: "로그인에 성공했습니다.",
      data: {
        sessionToken: token,
        user: user,
      },
    });
  } catch {
    //응답
    res.status(404);
    res.json({ message: "ID 혹은 비밀번호가 잘못되었습니다." });
  }
};
