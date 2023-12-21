import { NextApiRequest, NextApiResponse } from "next";
import { getIdFromToken } from "@/utils/JwtUtil";
import { findUserById, patchDisplayName } from "@/repository/user.repository";
import {
  findOptionByCode,
  updateOptionByCode,
} from "@/repository/hospital.repository";
import { HospitalOptDto } from "@/dto/HospitalOptDto";

// header 내 hospital-code 참조 -> 옵션 조회
export const getOption = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const hospitalOpt = await findOptionByCode(hospitalCode);
    if (!hospitalOpt) {
      res.status(404);
      res.json({
        message: "병원에 대한 옵션 정보를 불러오는 데 실패했습니다.",
      });
    }

    console.log(hospitalOpt);

    res.status(200);
    res.json({
      message: "병원에 대한 옵션 정보를 조회했습니다.",
      data: hospitalOpt,
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};

export const updateOption = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const newOption = req.body as HospitalOptDto;

    const updateOptResult = await updateOptionByCode(hospitalCode, newOption);
    if (!updateOptResult) {
      res.status(404);
      res.json({
        message: "병원에 대한 옵션 정보를 수정하는 데 실패했습니다.",
      });
    }

    console.log(updateOptResult);

    res.status(200);
    res.json({
      message: "병원에 대한 옵션 정보를 수정했습니다.",
    });
  } catch (e) {
    if (typeof e === "string") {
      console.log("error:400", e);
      res.status(400);
      return;
    }
    console.log("error: 500", e);
    res.status(500);
    return;
  }
};
