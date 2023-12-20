import prisma from "../../prisma/client";
import { UserDto } from "@/dto/UserDto";

export const findUser = async (
  id: string,
  password: string
): Promise<UserDto | null> => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: id,
        password: password,
      },
    });

    if (user == null) return null;
    else return UserDto.fromEntity(user);
  } catch (e) {
    console.log(e);
    return null;
  }
};
