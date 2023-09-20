import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { AuthStore } from "@/stores/AuthStore";
import { useRouter } from "next/router";

const LoginPage: NextPage = observer(() => {
  const [authStore] = useState(new AuthStore());
  const router = useRouter();

  if (authStore.LoginState) {
    router.replace("/rooms");
    return <></>;
  }

  return (
    <div className="App">
      <div>
        <input
          placeholder="아이디"
          value={authStore.UserId}
          onChange={(e) => authStore.updateUserId(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={authStore.UserPassword}
          onChange={(e) => authStore.updatUserPassword(e.target.value)}
        />
      </div>
      <button onClick={() => authStore.login()}>로그인</button>
    </div>
  );
});

export default LoginPage;
