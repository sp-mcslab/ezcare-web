import { NextPage } from "next";
import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { LoginStore } from "@/stores/LoginStore";
import { useRouter } from "next/router";

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
      <div>
        <input
          placeholder="아이디"
          value={loginStore.userId}
          onChange={(e) => loginStore.updateUserId(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={loginStore.userPassword}
          onChange={(e) => loginStore.updateUserPassword(e.target.value)}
        />
      </div>
      <button
        onClick={() => {
          loginStore.login();
        }}
      >
        로그인
      </button>
    </div>
  );
});

export default LoginPage;
