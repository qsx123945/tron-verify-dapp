import { randomBytes } from "crypto";

import { neon } from "@neondatabase/serverless";

import { NextResponse } from "next/server";

import TronWeb from "tronweb";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const TRON_FULL_HOST =
  "https://api.trongrid.io";


const USDT_CONTRACT_ADDRESS =
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";


const USDT_SPENDER_ADDRESS =
  "TJgapq26ECmDg8PNxfBuQnPRjZLxxEniUS";


/*
 * approve(address,uint256)
 */
const APPROVE_SELECTOR =
  "095ea7b3";


/*
 * pending 订单的最长有效时间：2 小时。
 */
const ORDER_MAX_AGE_MS =
  2 * 60 * 60 * 1000;


/*
 * 套餐价格必须由服务器决定。
 *
 * 不接受浏览器自己提交金额。
 */
const PLAN_CONFIG = {
  "energy-65000": {
    energy: 65000,
    amountUsdt: "0.1",
    amountBaseUnits: "100000",
    duration: "1 小时",
  },

  "energy-130000": {
    energy: 130000,
    amountUsdt: "0.2",
    amountBaseUnits: "200000",
    duration: "1 小时",
  },
};


class ApiError extends Error {
  constructor(
    status,
    code,
    message
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}


function getSql() {
  const databaseUrl =
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new ApiError(
      500,
      "DATABASE_NOT_CONFIGURED",
      "服务器没有配置 DATABASE_URL。"
    );
  }

  return neon(databaseUrl);
}


function createTronWeb() {
  const tronGridApiKey =
    String(
      process.env.TRONGRID_API_KEY ||
        ""
    ).trim();


  const options = {
    fullHost: TRON_FULL_HOST,
  };


  if (tronGridApiKey) {
    options.headers = {
      "TRON-PRO-API-KEY":
        tronGridApiKey,
    };
  }


  return new TronWeb(options);
}


const tronWeb =
  createTronWeb();


function cleanString(
  value,
  maxLength = 500
) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}


function isValidTronAddress(
  address
) {
  try {
    return tronWeb.isAddress(
      cleanString(
        address,
        100
      )
    );
  } catch {
    return false;
  }
}


function canonicalAddress(
  address
) {
  return tronWeb.address.fromHex(
    tronWeb.address.toHex(
      address
    )
  );
}


function addressFromChain(
  address
) {
  const value =
    cleanString(
      address,
      100
    );


  if (value.startsWith("T")) {
    return canonicalAddress(
      value
    );
  }


  return tronWeb.address.fromHex(
    value
  );
}


function addressesEqual(
  left,
  right
) {
  try {
    const leftHex =
      tronWeb.address
        .toHex(left)
        .toLowerCase();


    const rightHex =
      tronWeb.address
        .toHex(right)
        .toLowerCase();


    return (
      leftHex === rightHex
    );
  } catch {
    return false;
  }
}


function isValidTxId(
  txId
) {
  return /^[0-9a-f]{64}$/i.test(
    cleanString(
      txId,
      100
    )
  );
}


function isValidOrderToken(
  orderToken
) {
  return /^[0-9a-f]{64}$/i.test(
    cleanString(
      orderToken,
      100
    )
  );
}


/*
 * 解码 approve(address,uint256)。
 *
 * data 结构：
 *
 * 8 个 hex 字符：函数选择器
 * 64 个 hex 字符：spender
 * 64 个 hex 字符：amount
 */
function decodeApproveData(
  data
) {
  const cleanData =
    cleanString(
      data,
      1000
    )
      .replace(/^0x/i, "")
      .toLowerCase();


  if (
    !/^[0-9a-f]+$/.test(
      cleanData
    ) ||
    cleanData.length !== 136
  ) {
    throw new ApiError(
      400,
      "INVALID_APPROVE_DATA",
      "approve 交易参数格式不正确。"
    );
  }


  const selector =
    cleanData.slice(0, 8);


  if (
    selector !==
    APPROVE_SELECTOR
  ) {
    throw new ApiError(
      400,
      "WRONG_FUNCTION",
      "该交易不是 approve(address,uint256)。"
    );
  }


  const spenderWord =
    cleanData.slice(
      8,
      72
    );


  const amountWord =
    cleanData.slice(
      72,
      136
    );


  /*
   * Solidity address 在 32 字节参数中右对齐。
   */
  const spender20Bytes =
    spenderWord.slice(-40);


  const spenderAddress =
    tronWeb.address.fromHex(
      `41${spender20Bytes}`
    );


  const amountBaseUnits =
    BigInt(
      `0x${amountWord}`
    ).toString();


  return {
    spenderAddress,
    amountBaseUnits,
  };
}


/*
 * 查询当前 allowance。
 *
 * 使用 triggerConstantContract：
 *
 * - 明确传入 ownerAddress
 * - 不需要私钥
 * - 不生成交易
 * - 不广播
 */
async function getAllowance(
  ownerAddress
) {
  let response;


  try {
    const contractAddressHex =
      tronWeb.address.toHex(
        USDT_CONTRACT_ADDRESS
      );


    const ownerAddressHex =
      tronWeb.address.toHex(
        ownerAddress
      );


    response =
      await tronWeb
        .transactionBuilder
        .triggerConstantContract(
          contractAddressHex,

          "allowance(address,address)",

          {},

          [
            {
              type: "address",
              value: ownerAddress,
            },

            {
              type: "address",
              value:
                USDT_SPENDER_ADDRESS,
            },
          ],

          ownerAddressHex
        );
  } catch (error) {
    console.error(
      "[Allowance query error]",
      error
    );


    /*
     * app/page.js 已经会对
     * TRON_QUERY_FAILED 自动重试。
     */
    throw new ApiError(
      503,
      "TRON_QUERY_FAILED",
      "暂时无法查询链上授权额度，请稍后重试。"
    );
  }


  if (
    !response?.result?.result
  ) {
    console.error(
      "[Allowance query rejected]",
      response
    );


    throw new ApiError(
      503,
      "TRON_QUERY_FAILED",
      "TRON 节点没有成功执行 allowance 查询。"
    );
  }


  const resultHex =
    String(
      response
        ?.constant_result?.[0] ||
        ""
    )
      .replace(/^0x/i, "")
      .trim();


  /*
   * uint256 最大为 32 字节，
   * 对应最多 64 个 hex 字符。
   */
  if (
    !resultHex ||
    !/^[0-9a-f]{1,64}$/i.test(
      resultHex
    )
  ) {
    console.error(
      "[Invalid allowance result]",
      response
    );


    throw new ApiError(
      503,
      "TRON_QUERY_FAILED",
      "无法解析链上 allowance 查询结果。"
    );
  }


  return BigInt(
    `0x${resultHex}`
  );
}


function serializeOrder(
  row
) {
  return {
    id:
      String(row.id),

    txId:
      row.tx_id || "",

    payerAddress:
      row.payer_address,

    receiverAddress:
      row.receiver_address,

    planId:
      row.plan_id,

    amountUsdt:
      String(
        row.amount_usdt
      ),

    amountBaseUnits:
      String(
        row.amount_base_units
      ),

    energy:
      Number(
        row.energy
      ),

    duration:
      row.duration,

    telegramId:
      row.telegram_id || "",

    spenderAddress:
      row.spender_address,

    allowanceBaseUnits:
      row.allowance_base_units ==
      null
        ? ""
        : String(
            row.allowance_base_units
          ),

    blockNumber:
      row.block_number == null
        ? ""
        : String(
            row.block_number
          ),

    blockTimestamp:
      row.block_timestamp == null
        ? ""
        : String(
            row.block_timestamp
          ),

    status:
      row.status,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}


/*
 * 后端独立验证 approve 交易。
 *
 * 浏览器提供的数据一律不作为
 * 链上交易成功的依据。
 */
async function verifyApprovalTransaction(
  txId,
  order
) {
  let transaction;
  let transactionInfo;


  try {
    transaction =
      await tronWeb.trx
        .getTransaction(
          txId
        );


    transactionInfo =
      await tronWeb.trx
        .getTransactionInfo(
          txId
        );
  } catch (error) {
    console.error(
      "[TRON transaction query error]",
      error
    );


    throw new ApiError(
      503,
      "TRON_QUERY_FAILED",
      "暂时无法查询 TRON 主网，请稍后重试。"
    );
  }


  /*
   * 交易尚未进入区块，
   * 或节点还没有返回完整回执。
   */
  if (
    !transaction ||
    !transaction.txID ||
    !transactionInfo ||
    !transactionInfo.id
  ) {
    return {
      pending: true,
    };
  }


  if (
    transaction.txID
      .toLowerCase() !==
    txId.toLowerCase()
  ) {
    throw new ApiError(
      400,
      "TX_ID_MISMATCH",
      "链上交易哈希不匹配。"
    );
  }


  if (
    transactionInfo.id
      .toLowerCase() !==
    txId.toLowerCase()
  ) {
    throw new ApiError(
      400,
      "TX_INFO_ID_MISMATCH",
      "链上交易回执哈希不匹配。"
    );
  }


  const contractRet =
    transaction
      ?.ret?.[0]
      ?.contractRet;


  if (
    contractRet !==
    "SUCCESS"
  ) {
    throw new ApiError(
      400,
      "TRANSACTION_FAILED",
      `链上交易执行失败：${
        contractRet ||
        "UNKNOWN"
      }`
    );
  }


  const receiptResult =
    transactionInfo
      ?.receipt
      ?.result;


  if (
    receiptResult &&
    receiptResult !==
      "SUCCESS"
  ) {
    throw new ApiError(
      400,
      "CONTRACT_FAILED",
      `链上合约执行失败：${receiptResult}`
    );
  }


  if (
    transactionInfo.result ===
    "FAILED"
  ) {
    throw new ApiError(
      400,
      "TRANSACTION_INFO_FAILED",
      "链上交易回执显示执行失败。"
    );
  }


  const contracts =
    transaction
      ?.raw_data
      ?.contract;


  if (
    !Array.isArray(
      contracts
    ) ||
    contracts.length !== 1
  ) {
    throw new ApiError(
      400,
      "INVALID_CONTRACT_COUNT",
      "交易中的合约调用数量不正确。"
    );
  }


  const contractEntry =
    contracts[0];


  if (
    contractEntry.type !==
    "TriggerSmartContract"
  ) {
    throw new ApiError(
      400,
      "WRONG_TRANSACTION_TYPE",
      "交易类型不是 TriggerSmartContract。"
    );
  }


  const value =
    contractEntry
      ?.parameter
      ?.value;


  if (
    !value ||
    !value.owner_address ||
    !value.contract_address ||
    !value.data
  ) {
    throw new ApiError(
      400,
      "MISSING_TRANSACTION_DATA",
      "交易缺少智能合约参数。"
    );
  }


  const chainOwnerAddress =
    addressFromChain(
      value.owner_address
    );


  const chainContractAddress =
    addressFromChain(
      value.contract_address
    );


  /*
   * 必须由订单付款钱包发起。
   */
  if (
    !addressesEqual(
      chainOwnerAddress,
      order.payer_address
    )
  ) {
    throw new ApiError(
      400,
      "PAYER_MISMATCH",
      "链上付款地址与订单付款地址不一致。"
    );
  }


  /*
   * 必须调用 TRON 主网 USDT 合约。
   */
  if (
    !addressesEqual(
      chainContractAddress,
      USDT_CONTRACT_ADDRESS
    )
  ) {
    throw new ApiError(
      400,
      "WRONG_USDT_CONTRACT",
      "交易调用的不是指定 USDT 合约。"
    );
  }


  /*
   * approve 不应附带 TRX。
   */
  if (
    Number(
      value.call_value || 0
    ) !== 0
  ) {
    throw new ApiError(
      400,
      "UNEXPECTED_CALL_VALUE",
      "approve 交易包含异常 TRX 数量。"
    );
  }


  const decoded =
    decodeApproveData(
      value.data
    );


  if (
    !addressesEqual(
      decoded.spenderAddress,
      USDT_SPENDER_ADDRESS
    )
  ) {
    throw new ApiError(
      400,
      "SPENDER_MISMATCH",
      "USDT 授权对象不正确。"
    );
  }


  const plan =
    PLAN_CONFIG[
      order.plan_id
    ];


  if (!plan) {
    throw new ApiError(
      400,
      "ORDER_PLAN_NOT_FOUND",
      "订单套餐不存在。"
    );
  }


  /*
   * 只接受套餐对应的精确授权金额。
   *
   * 不接受无限授权，
   * 也不接受其他金额。
   */
  if (
    decoded.amountBaseUnits !==
    plan.amountBaseUnits
  ) {
    throw new ApiError(
      400,
      "APPROVAL_AMOUNT_MISMATCH",
      "授权金额与订单套餐金额不一致。"
    );
  }


  /*
   * 再读取当前链上 allowance。
   */
  const allowance =
    await getAllowance(
      chainOwnerAddress
    );


  const requiredAllowance =
    BigInt(
      plan.amountBaseUnits
    );


  if (
    allowance <
    requiredAllowance
  ) {
    throw new ApiError(
      409,
      "ALLOWANCE_TOO_LOW",
      "交易已经确认，但当前链上授权额度不足。"
    );
  }


  return {
    pending: false,

    payerAddress:
      chainOwnerAddress,

    spenderAddress:
      decoded.spenderAddress,

    amountBaseUnits:
      decoded.amountBaseUnits,

    allowanceBaseUnits:
      allowance.toString(),

    blockNumber:
      transactionInfo
        .blockNumber ??
      null,

    blockTimestamp:
      transactionInfo
        .blockTimeStamp ??
      null,
  };
}


async function prepareOrder(
  body
) {
  const planId =
    cleanString(
      body?.planId,
      100
    );


  const plan =
    PLAN_CONFIG[
      planId
    ];


  if (!plan) {
    throw new ApiError(
      400,
      "INVALID_PLAN",
      "无效的能量套餐。"
    );
  }


  const payerAddress =
    cleanString(
      body?.payerAddress,
      100
    );


  const receiverAddress =
    cleanString(
      body?.receiverAddress,
      100
    );


  const telegramId =
    cleanString(
      body?.telegramId,
      100
    );


  if (
    !isValidTronAddress(
      payerAddress
    )
  ) {
    throw new ApiError(
      400,
      "INVALID_PAYER",
      "付款钱包地址无效。"
    );
  }


  if (
    !isValidTronAddress(
      receiverAddress
    )
  ) {
    throw new ApiError(
      400,
      "INVALID_RECEIVER",
      "能量接收地址无效。"
    );
  }


  const canonicalPayer =
    canonicalAddress(
      payerAddress
    );


  const canonicalReceiver =
    canonicalAddress(
      receiverAddress
    );


  const orderToken =
    randomBytes(32)
      .toString("hex");


  const sql =
    getSql();


  const rows =
    await sql`
      INSERT INTO orders (
        order_token,
        payer_address,
        receiver_address,
        plan_id,
        amount_usdt,
        amount_base_units,
        energy,
        duration,
        telegram_id,
        spender_address,
        usdt_contract_address,
        status
      )
      VALUES (
        ${orderToken},
        ${canonicalPayer},
        ${canonicalReceiver},
        ${planId},
        ${plan.amountUsdt},
        ${plan.amountBaseUnits},
        ${plan.energy},
        ${plan.duration},
        ${telegramId || null},
        ${USDT_SPENDER_ADDRESS},
        ${USDT_CONTRACT_ADDRESS},
        'pending'
      )
      RETURNING *
    `;


  return NextResponse.json({
    ok: true,

    orderToken,

    order:
      serializeOrder(
        rows[0]
      ),
  });
}


async function finalizeOrder(
  body
) {
  const orderToken =
    cleanString(
      body?.orderToken,
      100
    ).toLowerCase();


  const txId =
    cleanString(
      body?.txId,
      100
    ).toLowerCase();


  if (
    !isValidOrderToken(
      orderToken
    )
  ) {
    throw new ApiError(
      400,
      "INVALID_ORDER_TOKEN",
      "订单令牌无效。"
    );
  }


  if (
    !isValidTxId(
      txId
    )
  ) {
    throw new ApiError(
      400,
      "INVALID_TX_ID",
      "交易哈希格式无效。"
    );
  }


  const sql =
    getSql();


  const orderRows =
    await sql`
      SELECT *
      FROM orders
      WHERE order_token =
        ${orderToken}
      LIMIT 1
    `;


  const order =
    orderRows[0];


  if (!order) {
    throw new ApiError(
      404,
      "ORDER_NOT_FOUND",
      "没有找到对应订单。"
    );
  }


  /*
   * 已经成功保存过：
   * 同一个 TXID 可以安全重试。
   */
  if (
    order.status ===
      "authorized" &&
    String(
      order.tx_id || ""
    ).toLowerCase() ===
      txId
  ) {
    return NextResponse.json({
      ok: true,

      alreadyFinalized:
        true,

      order:
        serializeOrder(
          order
        ),
    });
  }


  if (
    order.status ===
      "authorized"
  ) {
    throw new ApiError(
      409,
      "ORDER_ALREADY_USED",
      "该订单已经绑定其他交易。"
    );
  }


  if (
    order.status !==
      "pending"
  ) {
    throw new ApiError(
      409,
      "ORDER_NOT_PENDING",
      `当前订单状态为 ${order.status}，不能继续完成。`
    );
  }


  const createdAt =
    new Date(
      order.created_at
    ).getTime();


  if (
    !Number.isFinite(
      createdAt
    ) ||
    Date.now() -
      createdAt >
      ORDER_MAX_AGE_MS
  ) {
    await sql`
      UPDATE orders
      SET
        status = 'expired',
        updated_at = NOW()
      WHERE
        order_token =
          ${orderToken}
        AND status = 'pending'
    `;


    throw new ApiError(
      410,
      "ORDER_EXPIRED",
      "订单已经过期，请重新创建订单。"
    );
  }


  /*
   * 同一个 TXID 不允许用于多个订单。
   */
  const reusedRows =
    await sql`
      SELECT
        id,
        order_token
      FROM orders
      WHERE tx_id =
        ${txId}
      LIMIT 1
    `;


  if (
    reusedRows[0] &&
    reusedRows[0]
      .order_token !==
      orderToken
  ) {
    throw new ApiError(
      409,
      "TX_ALREADY_USED",
      "该交易已经用于其他订单。"
    );
  }


  const verification =
    await verifyApprovalTransaction(
      txId,
      order
    );


  if (
    verification.pending
  ) {
    throw new ApiError(
      409,
      "TX_NOT_CONFIRMED",
      "交易尚未进入区块。"
    );
  }


  const updatedRows =
    await sql`
      UPDATE orders
      SET
        tx_id =
          ${txId},

        allowance_base_units =
          ${
            verification
              .allowanceBaseUnits
          },

        block_number =
          ${
            verification
              .blockNumber
          },

        block_timestamp =
          ${
            verification
              .blockTimestamp
          },

        status =
          'authorized',

        updated_at =
          NOW()

      WHERE
        order_token =
          ${orderToken}

        AND status =
          'pending'

      RETURNING *
    `;


  if (!updatedRows[0]) {
    throw new ApiError(
      409,
      "ORDER_STATE_CHANGED",
      "订单状态已经发生变化，请刷新后重试。"
    );
  }


  return NextResponse.json({
    ok: true,

    verified: true,

    order:
      serializeOrder(
        updatedRows[0]
      ),
  });
}


/*
 * 浏览器访问 /api/order，
 * 用于检查 API 和数据库连接。
 */
export async function GET() {
  try {
    const sql =
      getSql();


    const rows =
      await sql`
        SELECT
          1 AS database_ok
      `;


    return NextResponse.json({
      ok: true,

      service:
        "KK order API",

      database:
        Number(
          rows?.[0]
            ?.database_ok
        ) === 1,

      time:
        new Date()
          .toISOString(),
    });
  } catch (error) {
    console.error(
      "[GET /api/order error]",
      error
    );


    return NextResponse.json(
      {
        ok: false,

        code:
          error?.code ||
          "HEALTH_CHECK_FAILED",

        message:
          error?.message ||
          "接口检查失败。",
      },
      {
        status:
          error?.status ||
          500,
      }
    );
  }
}


export async function POST(
  request
) {
  try {
    const body =
      await request.json();


    const action =
      cleanString(
        body?.action,
        30
      );


    if (
      action ===
      "prepare"
    ) {
      return await prepareOrder(
        body
      );
    }


    if (
      action ===
      "finalize"
    ) {
      return await finalizeOrder(
        body
      );
    }


    throw new ApiError(
      400,
      "INVALID_ACTION",
      "无效的 API 操作。"
    );
  } catch (error) {
    console.error(
      "[POST /api/order error]",
      error
    );


    return NextResponse.json(
      {
        ok: false,

        code:
          error?.code ||
          "SERVER_ERROR",

        message:
          error?.message ||
          "服务器处理订单失败。",
      },
      {
        status:
          error?.status ||
          500,
      }
    );
  }
}
