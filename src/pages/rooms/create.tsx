import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { RoomStore } from "@/stores/RoomStore";
import { useRouter } from "next/router";
import {
  Button,
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
import dayjs, { Dayjs } from "dayjs";

const ListPage: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await roomStore.getRoleWithSessionToken();
      if (roomStore.userRole != "nurse") {
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
      <div style={{ fontSize: "30px", paddingTop: "50px", paddingBottom: "25px" }}>
        방 생성
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
            목록으로
          </Button>
        </div>
      </div>

      <div
        style={{ display: "inline-block", paddingRight: "30px", float: "left" }}
      >
        <div style={{ paddingTop: "25px" }}>
          <input
            placeholder="방 제목"
            value={roomStore.createdRoomName}
            style={{ padding: "8px" }}
            onChange={(e) => roomStore.updateCreatedRoomName(e.target.value)}
          />
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
            />
          </LocalizationProvider>
          <div>진료실 예약 시, 예약 시간 10분 전부터 진료실이 오픈됩니다.</div>
        </div>

        <div style={{ paddingTop: "30px" }}>
          <input
            placeholder="환자코드 혹은 사번"
            style={{ padding: "8px" }}
            value={roomStore.inviteUserId}
            onChange={(e) => roomStore.UpdateInviteUserId(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => roomStore.pushinviteUserIdList()}
          >
            초대
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => postRoom()}
          >
            방 생성
          </Button>
        </div>
      </div>
      <div style={{ display: "inline-block" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>호스트</TableCell>
                <TableCell>이름</TableCell>
                <TableCell>권한</TableCell>
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
                      disabled={row.role == "patient" || row.host == true}
                      onClick={() => roomStore.pushHostUserList(row.id)}
                    >
                      등록
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={row.role == "patient" || row.host == false}
                      onClick={() => roomStore.popHostUserList(row.id)}
                    >
                      해제
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
                      취소
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
