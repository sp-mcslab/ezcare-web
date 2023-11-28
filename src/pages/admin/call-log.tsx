import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { AdminStore } from "@/stores/AdminStore";
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

const LogPage: NextPage = observer(() => {
  const [adminStore] = useState(new AdminStore());
  const router = useRouter();

  useEffect(() => {
    adminStore.findRecordAllRoom();
  }, [adminStore.findRecordAllRoom]);

  return (
    <div className="App">
      <div style={{ fontSize: "30px", paddingTop: "50px"}}>
        통화 이력
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
      <div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No</TableCell>
                <TableCell>roomId</TableCell>
                <TableCell>openAt</TableCell>
                <TableCell>deletedAt</TableCell>
                <TableCell>creatorId</TableCell>
                <TableCell>
                  <div>participants</div>
                  <div>userId / joinAt / exitAt</div>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.roomRecord.map((record, i) => (
                <TableRow key={record.roomId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{record.roomId}</TableCell>
                  <TableCell>{record.openAt.toString()}</TableCell>
                  <TableCell>
                    {record.deletedAt && record.deletedAt.toString()}
                  </TableCell>
                  <TableCell>{record.creatorId.toString()}</TableCell>
                  <TableCell>
                    {record.participants &&
                      record.participants.map((part) => (
                        <div key={part.userId}>
                          {part.userId} / {part.joinAt.toString()} /{" "}
                          {part.exitAt && part.exitAt!!.toString()}
                        </div>
                      ))}
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

export default LogPage;
