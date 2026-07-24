"use client";

import { useEffect, useState } from "react";
import WalletModal from "../components/WalletModal";


export default function Home() {

  const [telegramId, setTelegramId] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);


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
        minHeight:"100vh",
        padding:"50px",
        textAlign:"center",
        fontFamily:"Arial"
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

        onClick={() => setWalletModalOpen(true)}

        style={{
          padding:"15px 35px",
          fontSize:"18px",
          borderRadius:"12px",
          cursor:"pointer",
          marginTop:"30px"
        }}

      >

        连接钱包

      </button>



      {
        walletModalOpen && (

          <WalletModal

            onClose={() => setWalletModalOpen(false)}

          />

        )
      }



    </main>

  );

}
