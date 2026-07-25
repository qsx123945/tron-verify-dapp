import AppWalletProvider from "./WalletProvider";


export const metadata = {
  title: "KK TRON Energy",
  description: "KK TRON Energy Rental DApp",
};


export default function RootLayout({
  children,
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#080b18",
        }}
      >
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}
