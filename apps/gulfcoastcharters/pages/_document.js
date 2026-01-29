import { Html, Head, Main, NextScript } from 'next/document'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID || 'ca-pub-0940073536675562'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* AdSense: in head on every page so Google can verify and serve ads */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
