import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import ReactQueryProvider from "../providers/ReactQueryProvider";
import { AuthProvider } from "../providers/AuthProvider";
import Navbar from "../components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = localFont({
  variable: "--font-oswald",
  src: [
    { path: "../../public/fonts/Oswald-Light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/Oswald-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Oswald-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/Oswald-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/Oswald-Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "CineWeb — movies, mapped by the people who watch them",
  description:
    "Discover movies that are genuinely similar to each other, according to the community — not an algorithm.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ToastContainer theme="dark" position="bottom-right" />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
