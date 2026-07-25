"use client";

const WALLETS = [
  {
    id: "tronlink",
    name: "TronLink",
    logo: "/wallets/tronlink.png",
  },
  {
    id: "tokenpocket",
    name: "TokenPocket",
    logo: "/wallets/tokenpocket.png",
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    logo: "/wallets/trustwallet.png",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    logo: "/wallets/okx.png",
  },
  {
    id: "safepal",
    name: "SafePal",
    logo: "/wallets/safepal.png",
  },
  {
    id: "imtoken",
    name: "imToken",
    logo: "/wallets/imtoken.png",
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
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              选择付款钱包
            </h2>

            <p style={styles.description}>
              请选择您正在使用的钱包
            </p>
          </div>

          <button
            type="button"
            aria-label="关闭"
            style={styles.closeButton}
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
              style={styles.walletButton}
              onClick={() => onSelect(wallet.name)}
            >
              <span style={styles.logoBox}>
                <img
                  src={wallet.logo}
                  alt={`${wallet.name} 图标`}
                  style={styles.logoImage}
                />
              </span>

              <span style={styles.walletName}>
                {wallet.name}
              </span>
            </button>
          ))}
        </div>

        <p style={styles.safetyText}>
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
    width: "min(100%, 760px)",
    padding: "34px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "28px",
    background:
      "linear-gradient(145deg, #171d38, #0d1124)",
    color: "#ffffff",
    boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  description: {
    margin: "9px 0 0",
    color: "#8d97aa",
    fontSize: "16px",
  },

  closeButton: {
    width: "48px",
    height: "48px",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "15px",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "29px",
    lineHeight: 1,
  },

  walletGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "17px",
    marginTop: "30px",
  },

  walletButton: {
    display: "flex",
    minHeight: "150px",
    padding: "20px 12px",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "14px",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.035)",
    color: "#ffffff",
    cursor: "pointer",
  },

  logoBox: {
    display: "grid",
    width: "68px",
    height: "68px",
    placeItems: "center",
    overflow: "hidden",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
  },

  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  walletName: {
    fontSize: "18px",
    fontWeight: "700",
  },

  safetyText: {
    margin: "28px 0 0",
    color: "#707b91",
    fontSize: "14px",
    lineHeight: "1.6",
    textAlign: "center",
  },
};
