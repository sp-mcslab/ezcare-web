import React, { useState } from "react";
import { Button, createTheme, ThemeProvider } from "@mui/material";

interface PopupMenuProps {
  label: string;
  menuItems: string[];
  onMenuItemClick: (item: string) => void;
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#616161",
    },
  },
});
/**
 * 임시 팝업 메뉴이다.
 * @param label 팝업 메뉴 버튼의 레이블 텍스트이다.
 * @param menuItems 메뉴의 항목들이다.
 * @param onMenuItemClick 메뉴를 클릭했을 때 실행할 콜백함수이다.
 */
// TODO: 디자인 개선하기
const PopupMenu: React.FC<PopupMenuProps> = ({
  label,
  menuItems,
  onMenuItemClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (item: string) => {
    setIsOpen(false);
    onMenuItemClick(item);
  };

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
      </Button>
      {isOpen && (
        <ThemeProvider theme={theme}>
          <div>
            {menuItems.map((item) => (
              <Button
                variant="contained"
                color="primary"
                key={item}
                onClick={() => handleClick(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </ThemeProvider>
      )}
    </div>
  );
};

export default PopupMenu;
