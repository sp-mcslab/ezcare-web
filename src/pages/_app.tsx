import "@/styles/globals.scss";
import type { AppProps } from "next/app";
import React, { useContext, useEffect } from "react";
import "../styles/_main.scss";
import { ThemeContext, ThemeProvider } from "@/context/ThemeContext";
import userGlobalStore from "@/stores/global/UserGlobalStore";

export default function App({ Component, pageProps }: AppProps) {
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    userGlobalStore.tryToLoginWithSessionToken().then();
  }, []);

  return (
    <ThemeProvider>
      <div className={`${theme}`}>
        <div className={"background flex"}>
          <Component {...pageProps} />
        </div>
      </div>
    </ThemeProvider>
  );
}
