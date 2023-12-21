import prisma from "../../prisma/client";
import { User } from "@prisma/client";
import { HospitalOptDto } from "@/dto/HospitalOptDto";

export const findOptionByCode = async (
  code: string
): Promise<HospitalOptDto | null> => {
  try {
    const options = await prisma.hospital.findUnique({
      select: {
        joinopt: true,
        shareopt: true,
      },
      where: {
        code: code,
      },
    });

    if (!options) {
      return null;
    }

    return new HospitalOptDto({
      hospitalCode: code,
      joinOpt: options.joinopt,
      shareOpt: options.shareopt,
    });
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateOptionByCode = async (
  code: string,
  newOption: HospitalOptDto
): Promise<Boolean | null> => {
  try {
    await prisma.hospital.update({
      where: {
        code: code,
      },
      data: {
        joinopt: newOption.joinOpt,
        shareopt: newOption.shareOpt,
      },
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
