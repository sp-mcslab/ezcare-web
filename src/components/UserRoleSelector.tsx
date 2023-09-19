import React, { ChangeEvent } from "react";

interface UserRoleSelectorProps {
  isHost: boolean;
  onHostChange: (isHost: boolean) => void;
}

/**
 *  회원 API가 만들어지기 전에만 사용할 임시 셀렉터입니다.
 */
const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  isHost,
  onHostChange,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newIsHost = event.target.checked;
    onHostChange(newIsHost);
  };

  return (
    <div>
      <label>
        <input type="checkbox" checked={isHost} onChange={handleChange} />
        호스트 여부
      </label>
    </div>
  );
};

export default UserRoleSelector;
