import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { AdminStore } from "@/stores/AdminStore";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { useTranslation } from "react-i18next";

const LogPage: NextPage = observer(() => {
  const [adminStore] = useState(new AdminStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    (async () => {
      await adminStore.serverHealthCheck();
    })();
  }, [adminStore.serverHealthCheck]);

  if (!adminStore.didCheck) {
    return <>Loading...</>;
  }

  if (adminStore.errorMessage) {
    return <>Loading failed</>;
  }

  return (
    <div className="App">
      <div style={{ fontSize: "30px", paddingTop: "50px" }}>
        {t("server_health")}
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
      <div style={{ paddingTop: "50px" }}>
        <div>{adminStore.cpuData}</div>
        <div style={{ paddingTop: "25px" }}>{adminStore.memoryData}</div>
        <div style={{ paddingTop: "25px" }}>
          {adminStore.diskData.map((disk) => (
            <div key={disk}>{disk}</div>
          ))}
        </div>
        <div style={{ paddingTop: "25px" }}>
          {adminStore.networkData.map((network) => (
            <div key={network}>{network}</div>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: "50px" }}>
        <Button onClick={() => router.replace("/auth/logout")}>로그아웃</Button>
      </div>
    </div>
  );
});

export default LogPage;
