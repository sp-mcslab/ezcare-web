import { User, UserRole } from "@prisma/client";

export class UserDto {
  public readonly id: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly hospitalCode: string;

  constructor({
    id,
    name,
    role,
    hospitalCode,
  }: {
    id: string;
    name: string;
    role: UserRole;
    hospitalCode: string;
  }) {
    // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.id = id;
    this.name = name;
    this.role = role;
    this.hospitalCode = hospitalCode;
  }

  //Entity -> DTO
  public static fromEntity = (userEntity: User): UserDto => {
    return new UserDto({
      id: userEntity.id,
      name: userEntity.name,
      role: userEntity.role,
      hospitalCode: userEntity.hospitalcode,
    });
  };
}
