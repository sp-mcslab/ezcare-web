import { Option } from "@prisma/client";

export class HospitalOptDto {
  public readonly hospitalCode: string;
  public readonly joinOpt: Option;
  public readonly shareOpt: Option;

  constructor({
    hospitalCode,
    joinOpt,
    shareOpt,
  }: {
    hospitalCode: string;
    joinOpt: Option;
    shareOpt: Option;
  }) {
    this.hospitalCode = hospitalCode;
    this.joinOpt = joinOpt;
    this.shareOpt = shareOpt;
  }
}
