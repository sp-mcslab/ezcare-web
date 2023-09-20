import prisma from "../../prisma/client";
import { User } from "@prisma/client";

export const findUser = async (id: string, password: string): Promise<User | null> => {
  try {
    return await prisma.user.findFirst({
      where: {
        username: id,
        password: password,
      },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};