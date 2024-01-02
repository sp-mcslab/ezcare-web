import type { AppProps } from "next/app";
import React, { useContext, useEffect } from "react";
import "../styles/_main.scss";
import { ThemeContext, ThemeProvider } from "@/context/ThemeContext";
import userGlobalStore from "@/stores/global/UserGlobalStore";
import { I18nextProvider } from "react-i18next";
import i18n from "@/utils/i18nUtil";

export default function App({ Component, pageProps }: AppProps) {
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    userGlobalStore.tryToLogin().then();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <div className={`${theme}`}>
          <div className={"background flex"}>
            <Component {...pageProps} />
          </div>
        </div>
      </ThemeProvider>
    </I18nextProvider>
  );
}
