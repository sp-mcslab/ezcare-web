import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { LoginStore } from "@/stores/LoginStore";
import { useRouter } from "next/router";

const LogoutPage: NextPage = observer(() => {
  const [loginStore] = useState(new LoginStore());
  const router = useRouter();

  useEffect(() => {
    loginStore.logout();
    router.replace("/auth/login");
  }, [router]);

  return <></>;
});

export default LogoutPage;
