import { Inter } from "next/font/google";
import "./globals.css";
import TopBar from "./Components/Topbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Houl",
  description:
    "Next-Gen Streaming Platform: 0% commission pay-per-use platform with free starter plan for 1 month.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* <TopBar username={user.email} userId={user.uid} /> */}
        {children}
      </body>
    </html>
  );
}
