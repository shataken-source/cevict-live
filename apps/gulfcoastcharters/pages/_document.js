import { Html, Head, Main, NextScript } from 'next/document'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID || 'ca-pub-0940073536675562'
const SITE_VERIFY = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0066CC" />
        {/* Google site ownership (AdSense / Search Console): set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION per site */}
        {SITE_VERIFY ? <meta name="google-site-verification" content={SITE_VERIFY} /> : null}
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
