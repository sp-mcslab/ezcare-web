import prisma from "../../prisma/client";
import { User } from "@prisma/client";

export const findUserById = async (id: string): Promise<User | null> => {
  try {
    return await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};
