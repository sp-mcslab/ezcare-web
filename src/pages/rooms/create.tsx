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
  TableRow
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from 'dayjs';

const ListPage: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();

  const rows = [
    {
      id: "1",
      name: "홍길동",
      role: "의사",
    },
    {
      id: "2",
      name: "김철수",
      role: "간호사",
    },
    {
      id: "3",
      name: "황영희",
      role: "환자",
    },
  ];
  
  return (
    <div className="App">
      <div style={{ fontSize: "30px", paddingTop: "50px" }}>방 생성</div>
      <div
        style={{ display: "inline-block", paddingRight: "30px", float: "left" }}
      >
        <div style={{ paddingTop: "25px" }}>
          <input
            placeholder="방 제목"
            value={roomStore.createdRoomName}
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
                roomStore.updateCreatedAt(e)
              }}
            />
          </LocalizationProvider>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>

                  <Button
                    disabled={row.role=="환자"}
                    onClick={() => roomStore.pushHostUserList(row.id)}>
                    등록
                  </Button>
                  <Button
                    disabled={row.role=="환자"}
                    onClick={() => roomStore.popHostUserList(row.id)}>
                    해제
                  </Button>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div style={{ paddingTop: "30px" }}>
        <input
          placeholder="환자코드 혹은 사번"
          value={roomStore.inviteUserId}
          onChange={(e) => roomStore.UpdateInviteUserId(e.target.value)}
        />
        <Button onClick={() => roomStore.pushInviteUserList()}>초대</Button>
        <Button onClick={() => roomStore.postRoom()}>방 생성</Button>
      </div>
    </div>
  );
});

export default ListPage;
