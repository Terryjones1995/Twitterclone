import Head from 'next/head';

export function AppHead(): JSX.Element {
  return (
    <Head>
      <title>Quinte Social</title>
      <meta name='og:title' content='Quinte Social' />
      <link rel='icon' href='/favicon.ico' />
      <link rel='manifest' href='/site.webmanifest' key='site-manifest' />
      <meta name='twitter:site' content='@ccrsxx' />
      <meta name='twitter:card' content='summary_large_image' />
    </Head>
  );
}
