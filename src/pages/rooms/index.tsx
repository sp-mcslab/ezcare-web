import { RoomStore } from "@/stores/RoomStore";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { observer } from "mobx-react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const ListPage: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (roomStore.indexPageMessage != null) {
      alert(t(roomStore.indexPageMessage));
      roomStore.clearIndexPageMessage();
    }
  }, [roomStore.indexPageMessage]);

  useEffect(() => {
    roomStore.loadRoomList();
  }, [roomStore.loadRoomList]);

  useEffect(() => {
    (async () => {
      await roomStore.getUserData();
    })();
  }, [roomStore]);

  dayjs.extend(utc);

  const deleteRoom = async (roomId: string) => {
    await roomStore.deleteRoom(roomId);
    router.replace("/");
  };

  const changeLang = async (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="App">
      <div>
        {roomStore.userRole && roomStore.uid && roomStore.userHospitalCode ? (
          <div
            style={{
              fontSize: "40px",
              paddingTop: "20px",
              marginLeft: "30%",
            }}
          >
            {roomStore.uid} - {roomStore.userRole} -{" "}
            {roomStore.userHospitalCode}
          </div>
        ) : undefined}
      </div>
      <div
        style={{
          display: "inline-block",
          fontSize: "30px",
          paddingTop: "50px",
        }}
      >
        {t("room_list")}
      </div>
      {roomStore.userRole == "N" && (
        <div
          style={{
            display: "inline-block",
            float: "right",
            paddingTop: "50px",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/rooms/create")}
          >
            {t("room_create")}
          </Button>
        </div>
      )}
      {roomStore.userRole == "S" && (
        <div
          style={{
            display: "inline-block",
            float: "right",
            paddingTop: "50px",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/admin/call-log")}
            style={{ marginLeft: "10px" }}
          >
            {t("call_log")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/admin/operation-log")}
            style={{ marginLeft: "10px" }}
          >
            {t("operation_log")}
          </Button>
        </div>
      )}
      <div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No</TableCell>
                <TableCell style={{ width: "300px", textAlign: "center" }}>
                  {t("title")}
                </TableCell>
                <TableCell>{t("open_time")}</TableCell>
                <TableCell>{t("creator")}</TableCell>
                <TableCell></TableCell>
                {roomStore.userRole == "N" ? (
                  <TableCell></TableCell>
                ) : undefined}
              </TableRow>
            </TableHead>
            <TableBody>
              {roomStore.RoomList.map((room, i) => (
                <TableRow key={room.id}>
                  <TableCell>{i + 1}</TableCell>
                  {room.flag == "SCHEDULED" ? (
                    <TableCell style={{ textAlign: "center" }}>
                      [{t("reservation")}] {room.name}
                    </TableCell>
                  ) : (
                    <TableCell style={{ textAlign: "center" }}>
                      {room.name}
                    </TableCell>
                  )}
                  <TableCell>
                    {dayjs(room.openAt)
                      .utc(true)
                      .format("YYYY-MM-DD HH:mm")
                      .toString()}
                  </TableCell>
                  <TableCell>{room.creatorId}</TableCell>
                  {room.flag == "SCHEDULED" ? (
                    <TableCell></TableCell>
                  ) : (
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => router.replace("/rooms/" + room.id)}
                      >
                        {t("join")}
                      </Button>
                    </TableCell>
                  )}
                  {roomStore.userRole == "N" ? (
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => deleteRoom(room.id)}
                      >
                        {t("delete")}
                      </Button>
                    </TableCell>
                  ) : undefined}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div style={{ paddingTop: "25px" }}>
        <Button onClick={() => router.replace("/auth/logout")}>
          {t("logout")}
        </Button>

        <div
          style={{
            float: "right",
          }}
        >
          <Button onClick={() => changeLang("ar_AE")}>العربية</Button>
          <Button onClick={() => changeLang("en_US")}>English</Button>
          <Button onClick={() => changeLang("ko_KR")}>한국어</Button>
        </div>
      </div>
    </div>
  );
});

export default ListPage;
