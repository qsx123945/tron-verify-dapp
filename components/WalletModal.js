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

  const reportedConnectionRef =
    useRef("");


  /*
   * 弹窗打开时禁止底层页面滚动。
   * 弹窗内部仍然可以上下滑动。
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);


  function findAdapter(walletItem) {
    return wallets.find(
      (walletState) => {
        const adapterName =
          normalizeWalletName(
            walletState?.adapter?.name
          );

        return walletItem.keywords.some(
          (keyword) =>
            adapterName.includes(
              normalizeWalletName(
                keyword
              )
            )
        );
      }
    );
  }


  function handleWalletClick(
    walletItem
  ) {
    if (
      connecting ||
      pendingAdapterName
    ) {
      return;
    }

    if (!walletItem.enabled) {
      onError?.(
        `${walletItem.name} 需要通过 WalletConnect 接入，下一阶段继续配置。`
      );

      return;
    }

    const targetWallet =
      findAdapter(walletItem);

    if (
      !targetWallet?.adapter?.name
    ) {
      onError?.(
        `没有找到 ${walletItem.name} 的钱包适配器，请检查 WalletProvider 配置。`
      );

      return;
    }

    setSelectedDisplayName(
      walletItem.name
    );

    setPendingAdapterName(
      targetWallet.adapter.name
    );

    select(
      targetWallet.adapter.name
    );
  }


  /*
   * 等待 select 完成后，
   * 再连接当前选中的钱包。
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
        connectingRef.current =
          false;
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
   * 连接成功后把公开地址
   * 返回给 app/page.js。
   */
  useEffect(() => {
    if (!connected || !address) {
      return;
    }

    const reportKey =
      `${
        wallet?.adapter?.name || ""
      }:${address}`;

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
          onClose?.();
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
          <div style={styles.headerText}>
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
            style={{
              ...styles.closeButton,
              opacity: isBusy ? 0.55 : 1,
            }}
            disabled={isBusy}
            onClick={() => onClose?.()}
          >
            ×
          </button>
        </div>


        <div style={styles.walletGrid}>
          {WALLET_ITEMS.map(
            (walletItem) => {
              const isCurrent =
                selectedDisplayName ===
                walletItem.name;

              return (
                <button
                  type="button"
                  key={walletItem.id}
                  style={{
                    ...styles.walletButton,

                    opacity:
                      isBusy &&
                      !isCurrent
                        ? 0.45
                        : 1,

                    borderColor:
                      isCurrent
                        ? "rgba(103,232,249,0.75)"
                        : "rgba(255,255,255,0.13)",
                  }}
                  disabled={isBusy}
                  onClick={() =>
                    handleWalletClick(
                      walletItem
                    )
                  }
                >
                  <span
                    style={styles.logoBox}
                  >
                    <img
                      src={walletItem.logo}
                      alt={`${walletItem.name} 图标`}
                      style={
                        styles.logoImage
                      }
                    />
                  </span>

                  <span
                    style={styles.walletName}
                  >
                    {walletItem.name}
                  </span>

                  {!walletItem.enabled && (
                    <span
                      style={
                        styles.pendingLabel
                      }
                    >
                      WalletConnect
                    </span>
                  )}
                </button>
              );
            }
          )}
        </div>


        {isBusy && (
          <div
            style={styles.connectingBox}
          >
            正在连接
            {selectedDisplayName
              ? ` ${selectedDisplayName}`
              : "钱包"}
            ，请在钱包中允许访问账户地址……
          </div>
        )}


        <p style={styles.safetyText}>
          请确认钱包中显示的网站域名与当前页面一致。
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
    alignItems: "start",
    justifyItems: "center",

    padding: "12px",

    overflowY: "auto",
    overflowX: "hidden",

    background:
      "rgba(3, 6, 18, 0.76)",

    backdropFilter: "blur(10px)",
    WebkitBackdropFilter:
      "blur(10px)",

    WebkitOverflowScrolling:
      "touch",

    overscrollBehavior:
      "contain",

    touchAction: "pan-y",
  },


  modal: {
    width: "min(100%, 760px)",

    maxHeight:
      "calc(100dvh - 24px)",

    margin: "12px 0",

    padding:
      "28px 20px 24px",

    boxSizing: "border-box",

    overflowY: "auto",
    overflowX: "hidden",

    WebkitOverflowScrolling:
      "touch",

    overscrollBehavior:
      "contain",

    touchAction: "pan-y",

    border:
      "1px solid rgba(255,255,255,0.12)",

    borderRadius: "24px",

    background:
      "linear-gradient(145deg, #171d38, #0d1124)",

    color: "#ffffff",

    boxShadow:
      "0 25px 80px rgba(0,0,0,0.55)",
  },


  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: "14px",
  },


  headerText: {
    minWidth: 0,
  },


  title: {
    margin: 0,

    fontSize:
      "clamp(25px, 7vw, 30px)",

    lineHeight: 1.25,
  },


  description: {
    margin: "9px 0 0",

    color: "#8d97aa",

    fontSize:
      "clamp(13px, 4vw, 16px)",

    lineHeight: 1.5,
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
      "repeat(auto-fit, minmax(clamp(125px, 34vw, 170px), 1fr))",

    gap: "12px",

    marginTop: "24px",
  },


  walletButton: {
    display: "flex",

    minWidth: 0,
    minHeight: "128px",

    padding: "16px 8px",

    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",

    gap: "10px",

    border:
      "1px solid rgba(255,255,255,0.13)",

    borderRadius: "19px",

    background:
      "rgba(255,255,255,0.035)",

    color: "#ffffff",

    cursor: "pointer",

    transition:
      "opacity 0.2s, border-color 0.2s, background 0.2s",
  },


  logoBox: {
    display: "grid",

    width: "58px",
    height: "58px",

    flexShrink: 0,

    placeItems: "center",

    overflow: "hidden",

    borderRadius: "16px",

    background: "#ffffff",

    boxShadow:
      "0 10px 25px rgba(0,0,0,0.22)",
  },


  logoImage: {
    display: "block",

    width: "100%",
    height: "100%",

    objectFit: "cover",
  },


  walletName: {
    maxWidth: "100%",

    overflowWrap: "anywhere",

    fontSize: "16px",
    fontWeight: "700",

    lineHeight: 1.3,

    textAlign: "center",
  },


  pendingLabel: {
    padding: "4px 8px",

    borderRadius: "20px",

    background:
      "rgba(148,163,184,0.12)",

    color: "#94a3b8",

    fontSize: "10px",

    lineHeight: 1.2,
  },


  connectingBox: {
    marginTop: "20px",

    padding: "14px",

    border:
      "1px solid rgba(34,211,238,0.28)",

    borderRadius: "15px",

    background:
      "rgba(34,211,238,0.08)",

    color: "#67e8f9",

    fontSize: "13px",

    lineHeight: 1.6,

    textAlign: "center",
  },


  safetyText: {
    margin: "21px 0 0",

    paddingBottom:
      "env(safe-area-inset-bottom)",

    color: "#707b91",

    fontSize: "12px",

    lineHeight: 1.6,

    textAlign: "center",
  },
};
