"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useWallet,
} from "@tronweb3/tronwallet-adapter-react-hooks";


const WALLET_ITEMS = [
  {
    id: "tronlink",
    name: "TronLink",
    logo: "/wallets/tronlink.png",
    keywords: ["tronlink"],
    enabled: true,
  },
  {
    id: "tokenpocket",
    name: "TokenPocket",
    logo: "/wallets/tokenpocket.png",
    keywords: ["tokenpocket"],
    enabled: true,
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    logo: "/wallets/trustwallet.png",
    keywords: ["trust"],
    enabled: false,
  },
  {
    id: "okx",
    name: "OKX Wallet",
    logo: "/wallets/okx.png",
    keywords: ["okx"],
    enabled: true,
  },
  {
    id: "safepal",
    name: "SafePal",
    logo: "/wallets/safepal.png",
    keywords: ["safepal"],
    enabled: false,
  },
  {
    id: "imtoken",
    name: "imToken",
    logo: "/wallets/imtoken.png",
    keywords: ["imtoken"],
    enabled: true,
  },
];


function normalizeWalletName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}


export default function WalletModal({
  open,
  onClose,
  onConnected,
  onError,
}) {
  const {
    wallets,
    wallet,
    address,
    connected,
    connecting,
    select,
    connect,
  } = useWallet();

  const [
    pendingAdapterName,
    setPendingAdapterName,
  ] = useState("");

  const [
    selectedDisplayName,
    setSelectedDisplayName,
  ] = useState("");

  const connectingRef = useRef(false);
  const reportedConnectionRef = useRef("");


  function findAdapter(walletItem) {
    return wallets.find((walletState) => {
      const adapterName = normalizeWalletName(
        walletState?.adapter?.name
      );

      return walletItem.keywords.some((keyword) =>
        adapterName.includes(
          normalizeWalletName(keyword)
        )
      );
    });
  }


  function handleWalletClick(walletItem) {
    if (connecting || pendingAdapterName) {
      return;
    }

    if (!walletItem.enabled) {
      onError?.(
        `${walletItem.name} 需要通过 WalletConnect 接入，下一阶段继续配置。`
      );

      return;
    }

    const targetWallet = findAdapter(walletItem);

    if (!targetWallet?.adapter?.name) {
      onError?.(
        `没有找到 ${walletItem.name} 的钱包适配器，请检查 WalletProvider 配置。`
      );

      return;
    }

    setSelectedDisplayName(walletItem.name);

    setPendingAdapterName(
      targetWallet.adapter.name
    );

    /*
     * 这里只选择对应的钱包 Adapter。
     * 选择完成后，由下面的 useEffect 调用 connect。
     */
    select(targetWallet.adapter.name);
  }


  /*
   * 等待 select 更新完成后再调用 connect。
   * 避免 select 和 connect 同时执行导致连接到旧钱包。
   */
  useEffect(() => {
    if (!pendingAdapterName) {
      return;
    }

    if (
      wallet?.adapter?.name !==
      pendingAdapterName
    ) {
      return;
    }

    if (connectingRef.current) {
      return;
    }

    connectingRef.current = true;

    async function connectSelectedWallet() {
      try {
        await connect();
      } catch (error) {
        console.error(
          "[Wallet connect error]",
          error
        );

        setPendingAdapterName("");

        onError?.(
          error?.message ||
            `${selectedDisplayName} 连接失败，请重新尝试。`
        );
      } finally {
        connectingRef.current = false;
      }
    }

    connectSelectedWallet();
  }, [
    pendingAdapterName,
    wallet?.adapter?.name,
    connect,
    onError,
    selectedDisplayName,
  ]);


  /*
   * 连接成功或账户发生变化时，
   * 把钱包名称和公开地址返回给 page.js。
   */
  useEffect(() => {
    if (!connected || !address) {
      return;
    }

    const reportKey =
      `${wallet?.adapter?.name || ""}:${address}`;

    if (
      reportedConnectionRef.current ===
      reportKey
    ) {
      return;
    }

    reportedConnectionRef.current =
      reportKey;

    const displayName =
      selectedDisplayName ||
      wallet?.adapter?.name ||
      "TRON Wallet";

    setPendingAdapterName("");

    onConnected?.({
      walletName: displayName,
      address,
    });

    onClose?.();
  }, [
    connected,
    address,
    wallet?.adapter?.name,
    selectedDisplayName,
    onConnected,
    onClose,
  ]);


  if (!open) {
    return null;
  }


  const isBusy =
    connecting ||
    Boolean(pendingAdapterName);


  return (
    <div
      style={styles.overlay}
      onClick={() => {
        if (!isBusy) {
          onClose();
        }
      }}
    >
      <section
        style={styles.modal}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              选择付款钱包
            </h2>

            <p style={styles.description}>
              连接只会请求读取当前公开地址
            </p>
          </div>

          <button
            type="button"
            aria-label="关闭"
            style={styles.closeButton}
            disabled={isBusy}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={styles.walletGrid}>
          {WALLET_ITEMS.map(
            (walletItem) => (
              <button
                type="button"
                key={walletItem.id}
                style={{
                  ...styles.walletButton,
                  opacity:
                    isBusy &&
                    selectedDisplayName !==
                      walletItem.name
                      ? 0.5
                      : 1,
                }}
                disabled={isBusy}
                onClick={() =>
                  handleWalletClick(
                    walletItem
                  )
                }
              >
                <span style={styles.logoBox}>
                  <img
                    src={walletItem.logo}
                    alt={`${walletItem.name} 图标`}
                    style={styles.logoImage}
                  />
                </span>

                <span style={styles.walletName}>
                  {walletItem.name}
                </span>

                {!walletItem.enabled && (
                  <span
                    style={styles.pendingLabel}
                  >
                    WalletConnect
                  </span>
                )}
              </button>
            )
          )}
        </div>

        {isBusy && (
          <div style={styles.connectingBox}>
            正在连接
            {selectedDisplayName
              ? ` ${selectedDisplayName}`
              : "钱包"}
            ，请在钱包中允许访问账户地址……
          </div>
        )}

        <p style={styles.safetyText}>
          此步骤不会转账、不会签署交易，也不会产生代币授权。
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
    boxSizing: "border-box",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "28px",
    background:
      "linear-gradient(145deg, #171d38, #0d1124)",
    color: "#ffffff",
    boxShadow:
      "0 25px 80px rgba(0,0,0,0.55)",
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
    flexShrink: 0,
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "15px",
    background:
      "rgba(255,255,255,0.05)",
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
    gap: "12px",
    border:
      "1px solid rgba(255,255,255,0.13)",
    borderRadius: "22px",
    background:
      "rgba(255,255,255,0.035)",
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
    boxShadow:
      "0 10px 25px rgba(0,0,0,0.22)",
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

  pendingLabel: {
    padding: "4px 8px",
    borderRadius: "20px",
    background:
      "rgba(148,163,184,0.12)",
    color: "#94a3b8",
    fontSize: "11px",
  },

  connectingBox: {
    marginTop: "24px",
    padding: "15px",
    border:
      "1px solid rgba(34,211,238,0.28)",
    borderRadius: "15px",
    background:
      "rgba(34,211,238,0.08)",
    color: "#67e8f9",
    lineHeight: 1.6,
    textAlign: "center",
  },

  safetyText: {
    margin: "25px 0 0",
    color: "#707b91",
    fontSize: "14px",
    lineHeight: "1.6",
    textAlign: "center",
  },
};
