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

  useEffect(() => {
    (async () => {
      await roomStore.getRoleWithSessionToken();
      await roomStore.getUserIdWithSessionToken();
    })();
  }, [roomStore]);

  if (roomStore.failedToSignIn) {
    router.replace("/login");
    return <></>;
  }

  const deleteRoom = async (roomId: string) => {
    await roomStore.deleteRoom(roomId);
    router.replace("/");
  };

  return (
    <div className="App">
      <div>
        {roomStore.userRole && roomStore.uid ? (
          <div
            style={{
              fontSize: "40px",
              paddingTop: "20px",
              marginLeft: "30%",
            }}
          >
            {roomStore.uid} - {roomStore.userRole}
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
        방 목록
      </div>
      {roomStore.userRole == "nurse" && (
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
            방 생성
          </Button>

        </div>
      )}
      {roomStore.userRole == "systemManager" && (
        <div>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/admin/call-log")}
            style={{ marginLeft: "10px" }}
          >
            통화 이력
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
                  제목
                </TableCell>
                {roomStore.userRole == "nurse" ? (
                  <TableCell></TableCell>
                ) : undefined}
              </TableRow>
            </TableHead>
            <TableBody>
              {roomStore.RoomList.filter((it) => it.flag).map((room, i) => (
                <TableRow key={room.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell
                    onClick={() => router.replace("/rooms/" + room.id)}
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    {room.name}
                  </TableCell>
                  {roomStore.userRole == "nurse" ? (
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => deleteRoom(room.id)}
                      >
                        삭제
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
        <Button onClick={() => router.replace("/auth/logout")}>로그아웃</Button>
      </div>
    </div>
  );
});

export default ListPage;
