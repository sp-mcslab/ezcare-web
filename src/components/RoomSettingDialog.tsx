import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { CloseIcon } from "next/dist/client/components/react-dev-overlay/internal/icons/CloseIcon";
import { BlockedUser } from "@/models/room/BlockedUser";
import Button from "@mui/material/Button";

interface RoomSettingDialogProps {
  open: boolean;
  onClose: () => void;
  onUnblockedUser: (user: BlockedUser) => void;
  blacklist: BlockedUser[];
}

export const RoomSettingDialog: React.FC<RoomSettingDialogProps> = ({
  open,
  onClose,
  onUnblockedUser,
  blacklist,
}) => {
  const handleUnblockButton = (user: BlockedUser) => {
    if (confirm(`${user.name}님 차단을 해제합니다.`)) {
      onUnblockedUser(user);
    }
  };

  return (
    <Dialog sx={{ m: 0, p: 2 }} open={open}>
      <DialogTitle>설정</DialogTitle>
      <DialogContent>
        차단된 회원 목록
        {blacklist.map((user) => {
          return (
            <div key={user.id}>
              {user.name}
              <Button onClick={() => handleUnblockButton(user)}>해제</Button>
            </div>
          );
        })}
      </DialogContent>
      <DialogActions>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};
