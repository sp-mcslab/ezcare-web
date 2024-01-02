import { NextPage } from "next";
import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { LoginStore } from "@/stores/LoginStore";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { useTranslation } from "react-i18next";

const LoginPage: NextPage = observer(() => {
  const [loginStore] = useState(new LoginStore());
  const router = useRouter();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (loginStore.didLogin) {
      router.replace("/rooms");
    }
  }, [loginStore.didLogin]);

  useEffect(() => {
    if (loginStore.errorMessage != null) {
      alert(loginStore.errorMessage);
      loginStore.errorMessageShown();
    }
  }, [loginStore.errorMessage]);

  if (loginStore.didLogin) {
    return <>Loading...</>;
  }

  return (
    <div className="App">
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        <div>
          <input
            placeholder={t("id")}
            style={{ padding: "8px", margin: "8px" }}
            value={loginStore.userId}
            onChange={(e) => loginStore.updateUserId(e.target.value)}
          />
          <input
            placeholder={t("property_code")}
            style={{ padding: "8px", margin: "8px" }}
            value={loginStore.userPassword}
            onChange={(e) => loginStore.updateUserPassword(e.target.value)}
          />
        </div>
        <div style={{ paddingTop: "16px" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              loginStore.login();
            }}
          >
            {t("login")}
          </Button>
        </div>
      </div>
    </div>
  );
});

export default LoginPage;
