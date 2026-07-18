"use client";

export default function WalletModal({ open, onClose }) {

  if (!open) return null;

  const wallets = [
    {
      name: "TronLink",
      icon: "🔴"
    },
    {
      name: "TokenPocket",
      icon: "🟦"
    },
    {
      name: "Trust Wallet",
      icon: "🟣"
    },
    {
      name: "OKX Wallet",
      icon: "⚫"
    },
    {
      name: "SafePal",
      icon: "🔵"
    },
    {
      name: "imToken",
      icon: "🟠"
    }
  ];


  return (

    <div
      style={{
        position:"fixed",
        inset:0,
        background:"rgba(0,0,0,0.5)",
        display:"flex",
        justifyContent:"center",
        alignItems:"center"
      }}
    >

      <div
        style={{
          background:"#fff",
          padding:"30px",
          borderRadius:"15px",
          width:"320px"
        }}
      >

        <h2>
          选择钱包
        </h2>


        {
          wallets.map((wallet)=>(

            <button

              key={wallet.name}

              style={{
                width:"100%",
                padding:"12px",
                marginTop:"10px",
                fontSize:"16px"
              }}

            >

              {wallet.icon} {wallet.name}

            </button>

          ))
        }


        <button

          onClick={onClose}

          style={{
            marginTop:"20px",
            width:"100%"
          }}

        >
          取消

        </button>


      </div>


    </div>

  )

}
