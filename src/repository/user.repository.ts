import prisma from "../../prisma/client";
import { User, UserRole } from "@prisma/client";

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

export const findUserRoleById = async (
  id: string
): Promise<{ role: UserRole } | null> => {
  try {
    return await prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        role: true, // Specify the fields you want to select
      },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};
