import Link from 'next/link';
import cn from 'clsx';
import { motion } from 'framer-motion';
import { query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { twemojiParse } from '@lib/twemoji';
import { conversationsCollection, messagesCollection, usersCollection } from '@lib/firebase/collections';
import { useAuth } from '@lib/context/auth-context';
import { Error } from '@components/ui/error';
import { Loading } from '@components/ui/loading';
import { deleteConversation } from '@lib/firebase/utils';
import type { ConversationWithUser } from '@lib/types/conversation';
import type { MotionProps } from 'framer-motion';
import { useState, useEffect } from 'react';

export const variants: MotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.8 }
};

export function MessageTable(): JSX.Element {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<(ConversationWithUser & { lastMessage?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversationsWithLastMessage = async () => {
      try {
        // Fetch conversations where the user is either the sender or receiver
        const senderSnapshot = await getDocs(
          query(conversationsCollection, where('userId', '==', user?.id))
        );
        const receiverSnapshot = await getDocs(
          query(conversationsCollection, where('targetUserId', '==', user?.id))
        );

        const allConversations = [...senderSnapshot.docs, ...receiverSnapshot.docs];

        const conversationsWithMessages = await Promise.all(
          allConversations.map(async (conversationDoc) => {
            const conversationData = conversationDoc.data();
            const lastMessageSnapshot = await getDocs(
              query(
                messagesCollection,
                where('conversationId', '==', conversationDoc.id),
                orderBy('createdAt', 'desc'),
                limit(1)
              )
            );
            const lastMessage = lastMessageSnapshot.docs[0]?.data()?.text || 'No messages yet';

            // Determine the other participant's user ID
            const participantId = conversationData.userId === user?.id ? conversationData.targetUserId : conversationData.userId;

            let userData = { username: 'Unknown User', photoURL: '/default-avatar.png' }; // Default if user data is not fetched
            if (participantId) {
              try {
                const userDoc = await getDoc(doc(usersCollection, participantId));
                if (userDoc.exists()) {
                  userData = {
                    username: userDoc.data()?.username || 'Unknown User',
                    photoURL: userDoc.data()?.photoURL || '/default-avatar.png'
                  };
                } else {
                  console.warn(`No user found for ID: ${participantId}`);
                }
              } catch (err) {
                console.error(`Failed to fetch user data for ID: ${participantId}`, err);
              }
            } else {
              console.warn(`Participant ID is missing for conversation: ${conversationDoc.id}`);
            }

            return {
              ...conversationData,
              id: conversationDoc.id,
              lastMessage,
              user: userData,
            } as ConversationWithUser & { lastMessage: string };
          })
        );

        setConversations(conversationsWithMessages);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationsWithLastMessage();
  }, [user]);

  const handleDeleteConversation = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      setConversations((prev) => prev.filter((c) => c.id !== conversationToDelete));
      setShowDeleteModal(false);
      setConversationToDelete(null);
    }
  };

  const openDeleteModal = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  return (
    <section>
      {loading ? (
        <Loading />
      ) : conversations.length ? (
        <motion.div className={cn('mx-4 space-y-6 py-4')} {...variants}>
          {conversations.map((conversation) => (
            <div key={conversation.id} className="relative flex items-center gap-0.5 rounded-md border bg-white p-4 duration-200 hover:shadow-md dark:border-main-background dark:bg-zinc-900">
              <Link href={`/messages/${conversation.id}`} legacyBehavior>
                <div className="flex items-center cursor-pointer">
                  <Image
                    src={conversation.user?.photoURL || '/default-avatar.png'}
                    className="mr-2 h-14 w-14 flex-none rounded-full object-cover"
                    width={56}
                    height={56}
                    objectFit="cover"
                    alt={`User picture ${conversation.user?.username || 'User'}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <p className="w-full truncate font-bold">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: twemojiParse(conversation.user?.username || 'Unknown User'),
                        }}
                      />
                    </p>
                    <p className="text-sm text-light-secondary dark:text-dark-secondary">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => openDeleteModal(conversation.id)}
                className="text-red-500 ml-auto p-1"
              >
                Delete
              </button>
            </div>
          ))}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-80">
                <h2 className="text-lg font-bold text-center">Confirm Delete</h2>
                <p className="text-center mt-2">Are you sure you want to delete this conversation?</p>
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={handleDeleteConversation}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={closeDeleteModal}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <Error />
      )}
    </section>
  );
}
