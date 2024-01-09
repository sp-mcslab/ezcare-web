import { NextApiRequest, NextApiResponse } from "next";
import {
  addOptionByCode,
  findOptionByCode,
  deleteOptionByCode,
} from "@/repository/hospital.repository";

/**
 * header 내 hospital-code 참조 -> 옵션 조회
 * 결과 true -> 옵션 적용할 병원으로 저장되어 있음 -> 옵션이 적용됨
 * 결과 false -> 옵션 적용할 병원으로 저장되어 있지 않음 -> 별도 옵션 적용 없이 Default
 */
export const getOption = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const hospitalOpt = await findOptionByCode(hospitalCode);
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

/**
 * header 내 hospital-code 참조 -> 옵션을 저장할 병원을 저장 => 옵션 설정
 */
export const addOption = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }

    const addOptResult = await addOptionByCode(hospitalCode);
    if (!addOptResult) {
      res.status(404);
      res.json({
        message: "새로운 옵션 적용 대상 병원을 저장하는 데 실패했습니다.",
      });
    }

    console.log(addOptResult);

    res.status(200);
    res.json({
      message: "새로운 옵션 적용 대상 병원을 저장했습니다.",
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

/**
 * header 내 hospital-code 참조 -> 옵션을 저장할 병원 목록에서 제외 => 옵션 해제
 */
export const deleteOption = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const hospitalCode = req.headers["hospital-code"] as string;
    if (!hospitalCode) {
      res.status(401).end();
      return;
    }
    const deleteOptResult = await deleteOptionByCode(hospitalCode);
    if (!deleteOptResult) {
      res.status(404);
      res.json({
        message: "옵션 적용을 해제할 병원을 삭제하는 데 실패했습니다.",
      });
    }

    console.log(deleteOptResult);

    res.status(200);
    res.json({
      message: "옵션 적용을 해제할 병원을 삭제했습니다.",
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
