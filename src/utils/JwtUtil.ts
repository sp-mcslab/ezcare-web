import jwt from "jsonwebtoken";

export function signJWT(id: string, PRIVATE_KEY: string) {
  //유효기간 7일
  return jwt.sign({ id }, PRIVATE_KEY, {
    expiresIn: "7d",
  });
}

export function isValidToken(token: string, PRIVATE_KEY: string) {
  try {
    // 인자로 받은 token이 유효한지 확인
    jwt.verify(token, PRIVATE_KEY);
    // 유효하다면 true 반환
    return true;
  } catch (error: any) {
    // 만약 유효하지 않다면 false 반환
    return false;
  }
}