import prisma from "../../prisma/client";
import { Hospital } from "@prisma/client";
export const findTenant = async (code: string): Promise<Hospital | null> => {
  try {
    return await prisma.hospital.findFirst({
      where: {
        code: code,
      },
    });
  } catch (e) {
    console.log(e);
    return null;
  }
};
