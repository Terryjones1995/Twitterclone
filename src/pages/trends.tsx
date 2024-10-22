import { useRouter } from 'next/router';
import Link from 'next/link';
import { orderBy, query, collection } from 'firebase/firestore';
import { twemojiParse } from '@lib/twemoji';
import { preventBubbling } from '@lib/utils';
import { db } from '@lib/firebase/app';  // Assuming this is your firebase setup
import { formatNumber } from '@lib/date';
import { useCollection } from '@lib/hooks/useCollection';
import {
  TrendsLayout,
  ProtectedLayout
} from '@components/layout/common-layout';
import { MainLayout } from '@components/layout/main-layout';
import { SEO } from '@components/common/seo';
import { MainHeader } from '@components/home/main-header';
import { MainContainer } from '@components/home/main-container';
import { Button } from '@components/ui/button';
import { ToolTip } from '@components/ui/tooltip';
import { HeroIcon } from '@components/ui/hero-icon';
import type { ReactElement, ReactNode } from 'react';

// Reference trendsCollection from your Firestore
const trendsCollection = collection(db, 'trendsCollection');

export default function Bookmarks(): JSX.Element {
  const { back } = useRouter();

  // Check if trendsCollection is being correctly referenced
  console.log("Trends Collection Reference: ", trendsCollection);

  // Add more debugging to ensure Firestore query is working
  const { data, error } = useCollection(
    query(trendsCollection, orderBy('counter', 'desc'))
  );

  // Log the returned data or errors for troubleshooting
  console.log("Trends data: ", data);
  if (error) {
    console.error("Error fetching trends: ", error);
  }

  return (
    <MainContainer>
      <SEO title='Trends / Twitter' />
      <MainHeader useActionButton title='Trends' action={back}>
        <Button
          className='dark-bg-tab group relative ml-auto  p-2 hover:bg-light-primary/10
                     active:bg-light-primary/20 dark:hover:bg-dark-primary/10 dark:active:bg-dark-primary/20'
        >
          <HeroIcon className='h-5 w-5' iconName='Cog8ToothIcon' />
          <ToolTip tip='Settings' />
        </Button>
      </MainHeader>
      <div className='mx-4 space-y-6'>
        {data && data.length > 0 ? (
          data.map((doc) => {
            const { text, counter, user } = doc.data();
            const { name } = user || { name: "Unknown User" }; // Ensure user.name is handled properly

            return (
              <Link
                href={''}
                key={text}
                className='accent-tab relative block rounded-md border bg-white px-4 py-3 duration-200 hover:shadow-md dark:border-main-background dark:bg-zinc-900'
              >
                <span
                  className='flex  flex-col gap-0.5'
                  onClick={preventBubbling()}
                >
                  <div className='absolute right-2 top-2 hidden'>
                    <Button
                      className='hover-animation group relative  p-2
                                hover:bg-accent-blue/10 focus-visible:bg-accent-blue/20 
                                focus-visible:!ring-accent-blue/80'
                      onClick={preventBubbling()}
                    >
                      <HeroIcon
                        className='h-5 w-5 text-light-secondary group-hover:text-accent-blue 
                                  group-focus-visible:text-accent-blue dark:text-dark-secondary'
                        iconName='EllipsisHorizontalIcon'
                      />
                      <ToolTip tip='More' />
                    </Button>
                  </div>
                  <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                    Trending
                  </p>
                  <p className='truncate font-bold'>{text}</p>
                  <p className='truncate text-sm text-light-secondary dark:text-dark-secondary'>
                    Created by{' '}
                    <span
                      dangerouslySetInnerHTML={{ __html: twemojiParse(name) }}
                    />
                  </p>
                  <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                    {`${formatNumber(counter + 1)} Tweet${
                      counter === 0 ? '' : 's'
                    }`}
                  </p>
                </span>
              </Link>
            );
          })
        ) : (
          <p>No trending posts available at the moment.</p>
        )}
      </div>
    </MainContainer>
  );
}

Bookmarks.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      <TrendsLayout>{page}</TrendsLayout>
    </MainLayout>
  </ProtectedLayout>
);
