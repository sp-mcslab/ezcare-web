import React from "react";
import { Button } from "@mui/material";
import { useRouter } from "next/router";

interface MenuProps {
}
const Menu: React.FC<MenuProps> = ({
}) => {
  const router = useRouter();

  return (
    <div style={{textAlign: "center"}}>
      <Button onClick={() => router.replace("/rooms")}>방 목록</Button>
      <Button onClick={() => router.replace("/rooms/create")}>방 생성</Button>
      <Button onClick={() => router.replace("/admin/call-log")}>통화 이력</Button>
    </div>
  );
};

export default Menu;