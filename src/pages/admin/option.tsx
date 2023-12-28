import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { AdminStore } from "@/stores/AdminStore";
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
import { useTranslation } from "react-i18next";

const ListPage: NextPage = observer(() => {
  const [adminStore] = useState(new AdminStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (adminStore.patchOptionMessage != null) {
      alert(t(adminStore.patchOptionMessage));
      adminStore.clearPatchOptionMessage();
    }
  }, [adminStore.patchOptionMessage]);

  useEffect(() => {
    (async () => {
      await adminStore.getHospitalOption();
    })();
  }, [adminStore]);

  const patchOption = async () => {
    await adminStore.patchHospitalOption();
  };

  return (
    <div className="App">
      <div style={{ fontSize: "30px", paddingTop: "50px" }}>
        {t("hospital_option")}
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
            onClick={() => router.replace("/admin/operation-log")}
          >
            {t("operation_log")}
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
      <div style={{ textAlign: "center" }}>
        <div style={{ paddingTop: "25px" }}>
          {t("join_option")} : {adminStore.joinOpt}
          <div
            style={{
              display: "inline-block",
              float: "right",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => adminStore.updatejoinOpt(true)}
            >
              옵션 적용
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => adminStore.updatejoinOpt(false)}
            >
              옵션 해제
            </Button>
          </div>
        </div>
        <div style={{ paddingTop: "25px" }}>
          {t("share_option")}: {adminStore.shareOpt}
          <div
            style={{
              display: "inline-block",
              float: "right",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={() => adminStore.updateshareOpt(true)}
            >
              옵션 적용
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => adminStore.updateshareOpt(false)}
            >
              옵션 해제
            </Button>
          </div>
        </div>
        <div style={{ paddingTop: "25px" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => patchOption()}
          >
            {t("change_option")}
          </Button>
        </div>
      </div>
      <div>
        <Button onClick={() => router.replace("/auth/logout")}>로그아웃</Button>
      </div>
    </div>
  );
});

export default ListPage;
