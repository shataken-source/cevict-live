export const metadata = {
  title: 'Alpha Hunter API',
  description: 'Alpha Hunter Trading Bot API',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
