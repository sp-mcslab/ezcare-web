import prisma from "../../prisma/client";

export const findOptionByCode = async (
  code: string
): Promise<boolean | null> => {
  try {
    const options = await prisma.hospital.findUnique({
      select: { code: true },
      where: {
        code: code,
      },
    });

    if (!options) return false;
    else return true;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const addOptionByCode = async (
  code: string
): Promise<Boolean | null> => {
  try {
    await prisma.hospital.create({
      data: { code: code },
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const deleteOptionByCode = async (
  code: string
): Promise<Boolean | null> => {
  try {
    await prisma.hospital.delete({
      where: {
        code: code,
      },
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
