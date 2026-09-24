import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';
import { MARKETING } from '@/src/constants/marketing';

// Web-only root HTML for static rendering / SEO.
export default function Root({ children }: { children: ReactNode }) {
  const title = MARKETING.seoTitle;
  const description = MARKETING.seoDescription;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={MARKETING.seoKeywords} />
        <meta name="author" content="Bhabi Thulla" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#062820" />
        <link rel="canonical" href="https://bhabithullagame.web.app/" />

        <meta property="og:site_name" content="Bhabi Thulla" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content="https://bhabithullagame.web.app/" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />

        <meta name="application-name" content="Bhabi Thulla" />
        <meta name="apple-mobile-web-app-title" content="Bhabi Thulla" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: rootCss }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Bhabi Thulla',
              applicationCategory: 'GameApplication',
              operatingSystem: 'iOS, Web',
              description,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              genre: ['Card game', 'Multiplayer'],
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootCss = `
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  background-color: #060708;
  color: #F7F1E3;
  -webkit-font-smoothing: antialiased;
}
`;
