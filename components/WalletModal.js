"use client";

const WALLETS = [
  {
    id: "tronlink",
    name: "TronLink",
    icon: "🔷",
  },
  {
    id: "tokenpocket",
    name: "TokenPocket",
    icon: "TP",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "🛡️",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    icon: "OKX",
  },
  {
    id: "safepal",
    name: "SafePal",
    icon: "S",
  },
  {
    id: "imtoken",
    name: "imToken",
    icon: "im",
  },
];

export default function WalletModal({
  open,
  onClose,
  onSelect,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
    >
      <section
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.top}>
          <div>
            <h2 style={styles.title}>选择付款钱包</h2>

            <p style={styles.description}>
              请选择您正在使用的钱包
            </p>
          </div>

          <button
            type="button"
            aria-label="关闭"
            style={styles.close}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={styles.walletGrid}>
          {WALLETS.map((wallet) => (
            <button
              type="button"
              key={wallet.id}
              style={styles.wallet}
              onClick={() => onSelect(wallet.name)}
            >
              <span style={styles.icon}>
                {wallet.icon}
              </span>

              <span style={styles.name}>
                {wallet.name}
              </span>
            </button>
          ))}
        </div>

        <p style={styles.safety}>
          钱包只用于连接账户和确认您主动发起的交易。
        </p>
      </section>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    zIndex: 1000,
    inset: 0,
    display: "grid",
    padding: "20px",
    placeItems: "center",
    background: "rgba(3, 6, 18, 0.76)",
    backdropFilter: "blur(10px)",
  },

  modal: {
    width: "min(100%, 500px)",
    padding: "26px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "26px",
    background:
      "linear-gradient(145deg, #171d38, #0d1124)",
    color: "#ffffff",
    boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
  },

  top: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },

  title: {
    margin: 0,
    fontSize: "25px",
  },

  description: {
    margin: "8px 0 0",
    color: "#8d97aa",
    fontSize: "14px",
  },

  close: {
    width: "38px",
    height: "38px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "24px",
  },

  walletGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(125px, 1fr))",
    gap: "13px",
    marginTop: "24px",
  },

  wallet: {
    display: "flex",
    minHeight: "112px",
    padding: "14px 8px",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.035)",
    color: "#ffffff",
    cursor: "pointer",
  },

  icon: {
    display: "grid",
    width: "46px",
    height: "46px",
    placeItems: "center",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #22d3ee, #6366f1)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
  },

  name: {
    fontSize: "14px",
    fontWeight: "650",
  },

  safety: {
    margin: "20px 0 0",
    color: "#707b91",
    fontSize: "12px",
    lineHeight: "1.6",
    textAlign: "center",
  },
};
