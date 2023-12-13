import { User, UserRole } from "@prisma/client";

export class UserSearchDto {
  public readonly id: string;
  public readonly displayname: string;
  public readonly name: string;
  public readonly role: UserRole;

  constructor({
    id,
    displayname,
    name,
    role,
  }: {
    id: string;
    displayname: string;
    name: string;
    role: UserRole;
  }) {
    // 이 부분은 인자를 전달할때 name을 지정해서 넘길 수 있어서 이렇게 했습니다.
    this.id = id;
    this.displayname = displayname;
    this.name = name;
    this.role = role;
  }

  //Entity -> DTO
  public static fromEntity = (userEntity: User): UserSearchDto => {
    return new UserSearchDto({
      id: userEntity.id,
      displayname: userEntity.displayname,
      name: userEntity.name,
      role: userEntity.role,
    });
  };
}
