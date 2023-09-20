import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { AuthStore } from "@/stores/AuthStore";
import { useRouter } from "next/router";

const LogoutPage: NextPage = observer(() => {
  const [authStore] = useState(new AuthStore());
  const router = useRouter();

  useEffect(() => {
    authStore.logout();
    router.replace("/auth/login");
  }, [router]);

  return <></>;
});

export default LogoutPage;
