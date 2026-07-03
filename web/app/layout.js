import "./globals.css";

export const metadata = {
  title: "VietArr",
  description: "Thư viện phim VietArr"
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
