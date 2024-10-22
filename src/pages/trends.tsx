import { useRouter } from 'next/router';
import Link from 'next/link';
import { query, collection, getDocs, where } from 'firebase/firestore';
import { twemojiParse } from '@lib/twemoji';
import { db } from '@lib/firebase/app';
import { formatNumber } from '@lib/date';
import { useEffect, useState } from 'react';
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

// Reference to the tweets and users collection from Firestore
const tweetsCollection = collection(db, 'tweets');
const usersCollection = collection(db, 'users');

export default function Trends(): JSX.Element {
  const { back } = useRouter();
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tweets and sort by engagement
  useEffect(() => {
    const fetchTweets = async () => {
      try {
        const querySnapshot = await getDocs(query(tweetsCollection));
        const fetchedTweets = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const userLikesCount = data.userLikes ? data.userLikes.length : 0;
          const userRetweetsCount = data.userRetweets ? data.userRetweets.length : 0;

          // Check if the tweet is deleted
          if (data.isDeleted) {
            return null; // Exclude this tweet if it is deleted
          }

          // Fetch the username using the createdBy field
          const userDoc = await getDocs(query(usersCollection, where('id', '==', data.createdBy)));
          const userData = userDoc.docs[0]?.data();

          return {
            id: doc.id,
            ...data,
            userLikesCount,
            userRetweetsCount,
            username: userData?.username || 'Unknown User', // Set username here
            createdAt: data.createdAt.toDate(), // Ensure this is converted from Firestore Timestamp
          };
        }));

        // Filter out any null tweets (deleted ones)
        const validTweets = fetchedTweets.filter(tweet => tweet !== null);

        // Group tweets by date
        const groupedTweets = validTweets.reduce((acc, tweet) => {
          const dateKey = tweet.createdAt.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(tweet);
          return acc;
        }, {} as { [key: string]: any[] });

        // Sort tweets within each day by engagement and store them in an array
        const sortedGroupedTweets = Object.entries(groupedTweets).map(([date, tweets]) => {
          return {
            date,
            tweets: tweets.sort((a, b) => {
              const aEngagement = a.userLikesCount + a.userRetweetsCount;
              const bEngagement = b.userLikesCount + b.userRetweetsCount;
              return bEngagement - aEngagement; // Sort in descending order
            }),
          };
        });

        // Sort by date (most recent first)
        sortedGroupedTweets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Flatten the result for rendering
        const flattenedTweets = sortedGroupedTweets.flatMap(group => group.tweets);

        // Set the tweets with usernames
        setTweets(flattenedTweets);
      } catch (err) {
        console.error('Error fetching tweets: ', err);
        setError('Error fetching tweets from Firestore.');
      } finally {
        setLoading(false);
      }
    };

    fetchTweets();
  }, []);

  return (
    <MainContainer>
      <SEO title='Trends / Popular Tweets' />
      <MainHeader useActionButton title='Popular Tweets' action={back}>
        <Button
          className='dark-bg-tab group relative ml-auto p-2 hover:bg-light-primary/10
                     active:bg-light-primary/20 dark:hover:bg-dark-primary/10 dark:active:bg-dark-primary/20'
        >
          <HeroIcon className='h-5 w-5' iconName='Cog8ToothIcon' />
          <ToolTip tip='Settings' />
        </Button>
      </MainHeader>

      <div className='mx-4 space-y-6'>
        {/* Loading State */}
        {loading ? (
          <p>Loading popular tweets...</p>
        ) : error ? (
          <p>{error}</p>
        ) : tweets.length > 0 ? (
          tweets.map((tweet, index) => {
            const { text, userLikesCount, userRetweetsCount, username, id } = tweet;

            return (
              <Link
                href={`/${username}/status/${id}`} // Link to the specific tweet with username
                key={id || index}
                passHref
              >
                <div className='accent-tab relative block rounded-md border bg-white px-4 py-3 duration-200 hover:shadow-md dark:border-main-background dark:bg-zinc-900'>
                  <span className='flex flex-col gap-0.5'>
                    <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                      Popular Tweet
                    </p>
                    <p className='truncate font-bold'>{text}</p>
                    <p className='text-sm text-light-secondary dark:text-dark-secondary'>
                      {`${formatNumber(userLikesCount)} Like${userLikesCount === 1 ? '' : 's'} | ${formatNumber(userRetweetsCount)} Retweet${userRetweetsCount === 1 ? '' : 's'}`}
                    </p>
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <p>No popular tweets available at the moment.</p>
        )}
      </div>
    </MainContainer>
  );
}

Trends.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayout>
      <TrendsLayout>{page}</TrendsLayout>
    </MainLayout>
  </ProtectedLayout>
);
