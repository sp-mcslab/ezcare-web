import { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/router";

const MainPage: NextPage = observer(() => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/login");
  }, [router]);

  return <></>;
});

export default MainPage;
