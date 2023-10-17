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

const ListPage: NextPage = observer(() => {
  const [roomStore] = useState(new RoomStore());
  const router = useRouter();

  useEffect(() => {
    roomStore.loadRoomList();
  }, [roomStore.loadRoomList]);

  return (
    <div className="App">
      <div
        style={{
          display: "inline-block",
          fontSize: "30px",
          paddingTop: "50px",
        }}
      >
        방 목록
      </div>
      <div
        style={{ display: "inline-block", float: "right", paddingTop: "50px" }}
      >
        <Button onClick={() => router.replace("/rooms/create")}>방 생성</Button>
      </div>
      <div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No</TableCell>
                <TableCell style={{ width: "300px", textAlign: "center" }}>
                  제목
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roomStore.RoomList.map((room, i) => (
                <TableRow key={room.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell
                    onClick={() => router.replace("/rooms/" + room.id)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    {room.name}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => roomStore.deleteRoom(room.id)}>삭제</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div>
        <Button onClick={() => router.replace("/auth/logout")}>로그아웃</Button>
      </div>
    </div>
  );
});

export default ListPage;
