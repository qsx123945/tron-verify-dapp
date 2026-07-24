"use client";


export default function WalletModal({close}){


return (

<div

style={{

position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
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



<button>
🟦 TronLink
</button>


<br/><br/>


<button>
🟦 TokenPocket
</button>


<br/><br/>


<button>
🟦 Trust Wallet
</button>


<br/><br/>


<button>
🟦 imToken
</button>


<br/><br/>


<button>
🟦 OKX Wallet
</button>


<br/><br/>


<button>
🟦 SafePal
</button>



<br/><br/>


<button
onClick={close}
>
关闭
</button>


</div>


</div>


)

}
