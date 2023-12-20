import { useTranslation } from "react-i18next";
import { RoomStore } from "@/stores/RoomStore";
import { Button } from "@mui/material";

export const DisplayNameChanger = (roomStore:RoomStore) => {
  const { t, i18n } = useTranslation();
  var displayName = roomStore.userDisplayName;
  return (
    <div>
          <div>{t("display_name")}</div>
          {i18n.language == "ar_AE" ? (
            <div>
              <input
                defaultValue={displayName}
                onChange={(e) => (displayName = e.target.value)}
                dir="rtl"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => {roomStore.updateUserDisplayName(displayName); roomStore.patchUserDisplayName();}}
              >
                {t("change")}
              </Button>
            </div>
          ) : (
            <div>
              <input
                defaultValue={displayName}
                onChange={(e) => (displayName = e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => {roomStore.updateUserDisplayName(displayName); roomStore.patchUserDisplayName();}}
              >
                {t("change")}
              </Button>
            </div>
          )}
        </div>
  );
};
