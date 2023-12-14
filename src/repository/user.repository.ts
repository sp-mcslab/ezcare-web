import prisma from "../../image/client";
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

export const patchDisplayName = async (
  id: string,
  displayName: string
): Promise<Boolean | null> => {
  try {
    await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        displayname: displayName,
      },
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
