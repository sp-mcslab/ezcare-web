import jwt from "jsonwebtoken";

export function signJWT(id: string, PRIVATE_KEY: string) {
  //유효기간 7일
  return jwt.sign({ id }, PRIVATE_KEY, {
    expiresIn: "7d",
  });
}

export function verifyJWT(token: string, PRIVATE_KEY: string) {
  try {
    // 인자로 받은 token이 유효한지 확인하는 변수 (유효하다면 decoded가 존재)
    const decoded = jwt.verify(token, PRIVATE_KEY);
    // 유효하다면 payload에 decoded를 넣고 expired에 false로 리턴(만료되지 x)
    return { payload: decoded, expired: false };
  } catch (error: any) {
    // 만약 유효하지 않다면 payload는 Null, expired엔 errorMessage를 담아 리턴
    return { payload: null, expired: error.message.includes("jwt expired") };
  }
}