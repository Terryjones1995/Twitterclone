// src/lib/tweet-views.ts
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@lib/firebase/app';

/**
 * Increment the view count for a specific tweet
 * @param tweetId The ID of the tweet
 * @param userId The ID of the user viewing the tweet (to prevent double counting)
 */
export async function incrementTweetViews(tweetId: string, userId: string): Promise<void> {
  const tweetRef = doc(db, 'tweets', tweetId);
  
  try {
    // Increment the views count in the Firestore document
    await updateDoc(tweetRef, {
      views: increment(1)
    });
  } catch (error) {
    console.error('Failed to update tweet views: ', error);
  }
}
