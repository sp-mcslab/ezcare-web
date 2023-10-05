import { User, UserRole } from "@prisma/client";

export class UserDto {
  public readonly id: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly phone: string;
  public readonly pin: string;
  public readonly department: string;

  constructor({
    id,
    name,
    role,
    phone,
    pin,
    department,
  }: {
    id: string;
    name: string;
    role: UserRole;
    phone: string;
    pin: string;
    department: string;
  }) {
    // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.id = id;
    this.name = name;
    this.role = role;
    this.phone = phone;
    this.pin = pin;
    this.department = department;
  }

  //Entity -> DTO
  public static fromEntity = (userEntity: User): UserDto => {
    return new UserDto({
      id: userEntity.id,
      name: userEntity.name,
      role: userEntity.role,
      phone: userEntity.phone,
      pin: userEntity.pin,
      department: userEntity.department,
    });
  };
}
