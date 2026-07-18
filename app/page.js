"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [telegramId, setTelegramId] = useState("");

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("telegram_id");

    if (id) {
      setTelegramId(id);
    }

  }, []);


  return (
    <main
      style={{
        padding: "40px",
        textAlign: "center",
        fontFamily: "Arial"
      }}
    >

      <h1>
        🔐 TRON 钱包验证
      </h1>


      <p>
        Telegram ID:
      </p>


      <h2>
        {telegramId || "未获取"}
      </h2>


      <button
        style={{
          padding:"15px 30px",
          fontSize:"18px",
          borderRadius:"10px",
          cursor:"pointer"
        }}
      >
        连接钱包
      </button>


    </main>
  );
}
