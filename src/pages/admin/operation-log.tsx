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
import { useTranslation } from "react-i18next";

const OperationPage: NextPage = observer(() => {
  const [adminStore] = useState(new AdminStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    adminStore.findOperationAllRoom();
    console.log(adminStore.operationRecord);
  }, [adminStore.findOperationAllRoom]);

  const getTransactionText = (transaction: string) => {
    switch (transaction) {
      case "M0":
        return "MIC OFF";
      case "M1":
        return "MIC ON";
      case "V0":
        return "VIDEO OFF";
      case "V1":
        return "VIDEO ON";
      default:
        return "Unknown Transaction";
    }
  };

  return (
    <div className="App">
      <div style={{ fontSize: "30px", paddingTop: "50px" }}>
        {t("operation_log")}
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
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/admin/call-log")}
          >
            {t("call_log")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.replace("/admin/server-health")}
          >
            {t("server_health")}
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
                  <div>operations</div>
                  <div>
                    operator(FROM) / recipient(TO) / transaction / time /
                    success
                  </div>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminStore.operationRecord.map((record, i) => (
                <TableRow key={record.roomId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{record.roomId}</TableCell>
                  <TableCell>{record.openAt.toString()}</TableCell>
                  <TableCell>
                    {record.deletedAt && record.deletedAt.toString()}
                  </TableCell>
                  <TableCell>{record.creatorId.toString()}</TableCell>
                  <TableCell>
                    {record.operations &&
                      record.operations.map((part) => (
                        <div key={part.operator}>
                          {" "}
                          {part.operator} / {part.recipient} /{" "}
                          {getTransactionText(part.transaction)} /{" "}
                          {part.time.toString()} /{" "}
                          {part.success ? "SUCCESS" : "FAIL"}
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

export default OperationPage;
