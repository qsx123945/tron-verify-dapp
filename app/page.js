"use client";

import { useEffect, useState } from "react";
import WalletModal from "../components/WalletModal";

const ENERGY_PLANS = [
  {
    id: "energy-65000",
    energy: "65,000",
    energyValue: 65000,
    price: "0.1",
  },
  {
    id: "energy-130000",
    energy: "130,000",
    energyValue: 130000,
    price: "0.2",
  },
];

export default function Home() {
  const [telegramId, setTelegramId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [receiverAddress, setReceiverAddress] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("telegram_id");

    if (id) {
      setTelegramId(id);
    }
  }, []);

  function showMessage(text) {
    setMessage(text);
  }

  function validateAddress(address) {
    /*
      当前是基础格式验证：
      TRON Base58 地址通常以 T 开头并且长度为 34 位。

      下一阶段接入 TronWeb.isAddress，
      进行正式地址校验。
    */
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  }

  function handleConfirmRental() {
    if (!selectedPlan) {
      showMessage("请选择能量套餐");
      return;
    }

    const address = receiverAddress.trim();

    if (!address) {
      showMessage("请输入接收地址");
      return;
    }

    if (!validateAddress(address)) {
      showMessage("请输入有效的 TRON 钱包地址");
      return;
    }

    setWalletOpen(true);
  }

  function handleWalletSelect(walletName) {
    setWalletOpen(false);

    showMessage(
      `已选择 ${walletName}。\n下一步将接入真实的钱包连接和订单付款。`
    );
  }

  return (
    <main className="page">
      <section className="rentalCard">
        <header className="header">
          <div className="logo">⚡</div>

          <h1>KK TRON Energy</h1>

          <p>快速、便捷的 TRON 能量租赁服务</p>

          {telegramId && (
            <div className="telegramBadge">
              Telegram ID：{telegramId}
            </div>
          )}
        </header>

        <section className="content">
          <div className="sectionTitle">
            <span />
            <h2>选择租赁套餐</h2>
          </div>

          <div className="plans">
            {ENERGY_PLANS.map((plan) => {
              const active = selectedPlan?.id === plan.id;

              return (
                <button
                  type="button"
                  key={plan.id}
                  className={`plan ${active ? "active" : ""}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <strong>{plan.energy} Energy</strong>

                  <span className="price">
                    <span className="trxIcon">T</span>
                    {plan.price} TRX
                  </span>
                </button>
              );
            })}
          </div>

          <div className="addressBlock">
            <label htmlFor="receiverAddress">
              接收地址
            </label>

            <input
              id="receiverAddress"
              type="text"
              value={receiverAddress}
              placeholder="请输入您的能量接收地址"
              autoComplete="off"
              spellCheck="false"
              onChange={(event) =>
                setReceiverAddress(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="confirmButton"
            onClick={handleConfirmRental}
          >
            确认租赁
          </button>

          <div className="divider" />

          <div className="features">
            <div>
              <strong>30分钟</strong>
              <span>租赁期限</span>
            </div>

            <div>
              <strong>即时</strong>
              <span>到账时间</span>
            </div>

            <div>
              <strong>透明</strong>
              <span>链上可查</span>
            </div>
          </div>
        </section>
      </section>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onSelect={handleWalletSelect}
      />

      {message && (
        <div
          className="noticeOverlay"
          onClick={() => setMessage("")}
        >
          <div
            className="notice"
            onClick={(event) => event.stopPropagation()}
          >
            <p>{message}</p>

            <button
              type="button"
              onClick={() => setMessage("")}
            >
              确定
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 28px 16px;
          background:
            radial-gradient(
              circle at top,
              rgba(56, 189, 248, 0.14),
              transparent 38%
            ),
            #080b18;
          color: #ffffff;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        .rentalCard {
          width: min(100%, 700px);
          margin: 0 auto;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(24, 30, 58, 0.98),
              rgba(13, 17, 36, 0.98)
            );
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.5),
            inset 0 1px rgba(255, 255, 255, 0.05);
        }

        .header {
          padding: 40px 28px 30px;
          text-align: center;
          background:
            linear-gradient(
              135deg,
              rgba(25, 32, 66, 0.98),
              rgba(15, 20, 44, 0.98)
            );
        }

        .logo {
          display: grid;
          width: 78px;
          height: 78px;
          margin: 0 auto 20px;
          place-items: center;
          border-radius: 22px;
          background:
            linear-gradient(135deg, #22d3ee, #6366f1);
          box-shadow:
            0 15px 35px rgba(34, 211, 238, 0.24);
          font-size: 34px;
        }

        .header h1 {
          margin: 0;
          font-size: clamp(30px, 7vw, 48px);
          letter-spacing: -1px;
        }

        .header p {
          margin: 13px 0 0;
          color: #9ca3af;
          font-size: 17px;
        }

        .telegramBadge {
          display: inline-block;
          max-width: 100%;
          margin-top: 18px;
          padding: 8px 14px;
          overflow: hidden;
          border: 1px solid rgba(34, 211, 238, 0.18);
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.08);
          color: #a5f3fc;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .content {
          padding: 34px 28px;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .sectionTitle span {
          width: 5px;
          height: 30px;
          border-radius: 999px;
          background:
            linear-gradient(#22d3ee, #818cf8);
        }

        .sectionTitle h2 {
          margin: 0;
          font-size: 22px;
        }

        .plans {
          display: grid;
          gap: 18px;
        }

        .plan {
          display: flex;
          width: 100%;
          min-height: 104px;
          padding: 22px 24px;
          align-items: center;
          justify-content: space-between;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.025);
          color: #ffffff;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .plan:hover {
          transform: translateY(-2px);
          border-color: rgba(34, 211, 238, 0.5);
        }

        .plan.active {
          border-color: #22d3ee;
          background:
            linear-gradient(
              135deg,
              rgba(34, 211, 238, 0.11),
              rgba(99, 102, 241, 0.1)
            );
          box-shadow:
            0 0 0 4px rgba(34, 211, 238, 0.07);
        }

        .plan strong {
          font-size: clamp(21px, 5vw, 29px);
        }

        .price {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #67e8f9;
          font-size: 21px;
          font-weight: 750;
        }

        .trxIcon {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 50%;
          background: #22d3ee;
          color: #07101d;
          font-size: 14px;
        }

        .addressBlock {
          margin-top: 30px;
        }

        .addressBlock label {
          display: block;
          margin-bottom: 12px;
          color: #e5e7eb;
          font-size: 19px;
          font-weight: 650;
        }

        .addressBlock input {
          width: 100%;
          height: 70px;
          padding: 0 20px;
          outline: none;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          color: #ffffff;
          font-size: 16px;
          transition: border-color 160ms ease;
        }

        .addressBlock input:focus {
          border-color: #22d3ee;
        }

        .addressBlock input::placeholder {
          color: #60697d;
        }

        .confirmButton {
          width: 100%;
          min-height: 68px;
          margin-top: 28px;
          border: 0;
          border-radius: 18px;
          background:
            linear-gradient(100deg, #06b6d4, #6366f1);
          color: #ffffff;
          cursor: pointer;
          box-shadow:
            0 14px 35px rgba(56, 189, 248, 0.2);
          font-size: 22px;
          font-weight: 750;
        }

        .confirmButton:active {
          transform: scale(0.99);
        }

        .divider {
          height: 1px;
          margin: 32px 0;
          background: rgba(255, 255, 255, 0.09);
        }

        .features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          text-align: center;
        }

        .features div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 7px;
        }

        .features strong {
          color: #67e8f9;
          font-size: clamp(18px, 4.5vw, 25px);
        }

        .features span {
          color: #778196;
          font-size: 14px;
        }

        .noticeOverlay {
          position: fixed;
          z-index: 2000;
          inset: 0;
          display: grid;
          padding: 22px;
          place-items: center;
          background: rgba(3, 6, 18, 0.72);
          backdrop-filter: blur(9px);
        }

        .notice {
          width: min(100%, 420px);
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.45);
          text-align: center;
        }

        .notice p {
          margin: 0 0 24px;
          white-space: pre-line;
          font-size: 18px;
          line-height: 1.55;
        }

        .notice button {
          width: 100%;
          min-height: 52px;
          border: 0;
          border-radius: 14px;
          background:
            linear-gradient(100deg, #06b6d4, #6366f1);
          color: #ffffff;
          cursor: pointer;
          font-size: 17px;
          font-weight: 700;
        }

        @media (max-width: 520px) {
          .page {
            padding: 0;
          }

          .rentalCard {
            min-height: 100vh;
            border: 0;
            border-radius: 0;
          }

          .header {
            padding: 34px 20px 27px;
          }

          .content {
            padding: 28px 20px 36px;
          }

          .plan {
            min-height: 94px;
            padding: 18px;
          }

          .price {
            font-size: 18px;
          }

          .addressBlock input {
            height: 64px;
          }

          .features {
            gap: 6px;
          }
        }
      `}</style>
    </main>
  );
}
