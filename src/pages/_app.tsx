import "@/styles/globals.scss";
import type { AppProps } from "next/app";
import React, { useContext } from "react";
import "../styles/_main.scss";
import { ThemeContext, ThemeProvider } from "@/context/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  const { theme } = useContext(ThemeContext);
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
