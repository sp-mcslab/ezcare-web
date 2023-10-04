import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { LoginStore } from "@/stores/LoginStore";
import userGlobalStore from "@/stores/global/UserGlobalStore";
import { useRouter } from "next/router";

const LoginPage: NextPage = observer(() => {
  const [loginStore] = useState(new LoginStore());
  const router = useRouter();

  if (userGlobalStore.successToLogin) {
    router.replace("/rooms");
    return <></>;
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
      <button onClick={() => loginStore.login()}>로그인</button>
    </div>
  );
});

export default LoginPage;
