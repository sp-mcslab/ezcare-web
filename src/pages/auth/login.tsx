import { NextPage } from "next";
import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { LoginStore } from "@/stores/LoginStore";
import { useRouter } from "next/router";
import {
  Button
} from "@mui/material";

const LoginPage: NextPage = observer(() => {
  const [loginStore] = useState(new LoginStore());
  const router = useRouter();

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
          placeholder="아이디"
          style={{ padding: "8px", margin: "8px" }}
          value={loginStore.userId}
          onChange={(e) => loginStore.updateUserId(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
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
        로그인
      </Button>
      </div>
      </div>
    </div>
  );
});

export default LoginPage;
