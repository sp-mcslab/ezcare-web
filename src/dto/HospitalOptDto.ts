export class HospitalOptDto {
  public readonly hospitalCode: string;
  public readonly joinOpt: boolean;

  constructor({
    hospitalCode,
    joinOpt,
  }: {
    hospitalCode: string;
    joinOpt: boolean;
  }) {
    this.hospitalCode = hospitalCode;
    this.joinOpt = joinOpt;
  }
}
