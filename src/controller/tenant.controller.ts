//Service
import { NextApiRequest, NextApiResponse } from "next";
import { findTenant } from "@/repository/tenant.repository";

export const tenant = async (req: NextApiRequest, res: NextApiResponse) => {
  const hospital = "Hospital-Code";
  const hospitalCode = req.headers[hospital];

  try {
    const result = findTenant(hospitalCode as string);

    if (result == null) {
      res.status(401).end();
      return;
    }

    res.status(200);
    res.json({
      message: "소속 병원이 조회되었습니다.",
      data: {
        hospital: result,
      },
    });
    res.status(200).end();
  } catch (e) {
    console.log(e);
    res.status(500).end();
    return;
  }
};
