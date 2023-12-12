import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { RoomStore } from "@/stores/RoomStore";
import { useRouter } from "next/router";
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

const ListPage: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    (async () => {
      await roomStore.getRoleWithSessionToken();
      if (roomStore.userRole != "N") {
        router.replace("/rooms");
        return <></>;
      }
    })();
  }, [roomStore]);

  const postRoom = async () => {
    await roomStore.postRoom();
    router.replace("/rooms");
  };

  return (
    <div className="App">
      <div
        style={{ fontSize: "30px", paddingTop: "50px", paddingBottom: "25px" }}
      >
        {t("room_create")}
        <div
          style={{
            display: "inline-block",
            float: "right",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/rooms")}
          >
            {t("go_list")}
          </Button>
        </div>
      </div>

      <div
        style={{ display: "inline-block", paddingRight: "30px", float: "left" }}
      >
        {i18n.language == "ar_AE" ? (
          <div style={{ paddingTop: "25px" }}>
            <input
              placeholder={t("title")}
              value={roomStore.createdRoomName}
              style={{ padding: "8px" }}
              onChange={(e) => roomStore.updateCreatedRoomName(e.target.value)}
              dir="rtl"
            />
          </div>
        ) : (
          <div style={{ paddingTop: "25px" }}>
            <input
              placeholder={t("title")}
              value={roomStore.createdRoomName}
              style={{ padding: "8px" }}
              onChange={(e) => roomStore.updateCreatedRoomName(e.target.value)}
            />
          </div>
        )}
        <div style={{ paddingTop: "25px" }}>
          <Checkbox
            value={roomStore.isRoomCreateLater}
            onChange={roomStore.UpdateIsRoomCreateLater}
          />
          {t("reservation_room_create")}
        </div>
        <div style={{ paddingTop: "25px" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              format="YYYY-MM-DD hh:mm"
              showDaysOutsideCurrentMonth
              defaultValue={dayjs()}
              onChange={(e) => {
                roomStore.updateCreatedAt(e);
              }}
              disabled={!roomStore.isRoomCreateLater}
            />
          </LocalizationProvider>
        </div>

        {i18n.language == "ar_AE" ? (
          <div style={{ paddingTop: "30px" }}>
            <input
              placeholder={t("input_patient_code")}
              style={{ padding: "8px" }}
              value={roomStore.inviteUserId}
              onChange={(e) => roomStore.UpdateInviteUserId(e.target.value)}
              dir="rtl"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => roomStore.pushinviteUserIdList()}
            >
              {t("invite")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => postRoom()}
            >
              {t("room_create")}
            </Button>
          </div>
        ) : (
          <div style={{ paddingTop: "30px" }}>
            <input
              placeholder={t("input_patient_code")}
              style={{ padding: "8px" }}
              value={roomStore.inviteUserId}
              onChange={(e) => roomStore.UpdateInviteUserId(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => roomStore.pushinviteUserIdList()}
            >
              {t("invite")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => postRoom()}
            >
              {t("room_create")}
            </Button>
          </div>
        )}
      </div>
      <div style={{ display: "inline-block" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("host")}</TableCell>
                <TableCell>{t("name")}</TableCell>
                <TableCell>{t("role")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roomStore.inviteUserList.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={row.role == "P" || row.host == true}
                      onClick={() => roomStore.pushHostUserList(row.id)}
                    >
                      {t("register")}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={row.role == "P" || row.host == false}
                      onClick={() => roomStore.popHostUserList(row.id)}
                    >
                      {t("cancel")}
                    </Button>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => roomStore.popInviteUserList(row.id)}
                    >
                      {t("delete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
});

export default ListPage;
