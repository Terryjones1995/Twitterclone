import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import {
  addDoc,
  doc,
  getDoc,
  query,
  serverTimestamp,
  where,
  WithFieldValue
} from 'firebase/firestore';
import cn from 'clsx';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BiNavigation } from 'react-icons/bi';
import { twemojiParseWithLinks } from '@lib/twemoji';
import * as emoji from 'node-emoji';
import {
  conversationsCollection,
  messagesCollection,
  usersCollection
} from '@lib/firebase/collections';
import { useCollection } from '@lib/hooks/useCollection';
import { useAuth } from '@lib/context/auth-context';
import {
  MessageLayout,
  ProtectedLayout
} from '@components/layout/common-layout';
import { MainLayoutWithoutSidebar } from '@components/layout/main-layout-without-sidebar';
import { SEO } from '@components/common/seo';
import { MainHeader } from '@components/home/main-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import Modal from '@components/ui/modal';
import type { Message } from '@lib/types/message';
import type {
  Conversation,
  ConversationWithUser
} from '@lib/types/conversation';
import type { User } from '@lib/types/user';
import type { MotionProps } from 'framer-motion';

export const variants: MotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 }
};

export default function MessagePage(): JSX.Element {
  const [conversation, setConversation] = useState<ConversationWithUser>();
  const { user } = useAuth();
  const { back } = useRouter();
  const { conversation: conversationId } = useParams();

  const [inputValue, setInputValue] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, loading } = useCollection(
    query(messagesCollection, where('conversationId', '==', conversationId))
  );

  useEffect(() => {
    const fetchConversationData = async () => {
      try {
        const conversationDoc = await getDoc(
          doc(conversationsCollection, conversationId as string)
        );
        const conversationData = conversationDoc.data() as Conversation | undefined;

        if (conversationData) {
          const otherUserId =
            conversationData.targetUserId === user?.id
              ? conversationData.userId
              : conversationData.targetUserId;

          if (!otherUserId) return;

          const userDoc = await getDoc(doc(usersCollection, otherUserId));
          const userData = userDoc.exists()
            ? (userDoc.data() as User)
            : undefined;

          if (userData) {
            setConversation({
              ...conversationData,
              user: {
                ...userData,
                id: userDoc.id,
                name: userData.name || "User",
                username: userData.username || "unknown",
                photoURL: userData.photoURL || "/assets/default-avatar.jpg"
              },
            });
          }
        }
      } catch (error) {
        console.error("Error fetching conversation data:", error);
        back();
      }
    };

    fetchConversationData();
  }, [conversationId, user, back]);

  const handleSendMessage = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!inputValue) return;

    setInputValue('');

    await addDoc(messagesCollection, {
      conversationId: conversationId as string,
      text: inputValue,
      userId: user?.id,
      createdAt: serverTimestamp(),
      updatedAt: null
    } as WithFieldValue<Omit<Message, 'id'>>);
  };

  const handleDeleteConversation = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    back();
  };

  const renderDateSeparator = (date: Date) => {
    return (
      <div className="text-center text-xs text-gray-500 my-4">
        {date.toDateString()}
      </div>
    );
  };

  return (
    <main className={cn('flex min-h-screen w-full max-w-xl flex-col bg-black text-white')}>
      <SEO title={`Message with ${conversation?.user.name || 'User'}`} />

      {/* Header with back button, name, username, and delete button */}
      <MainHeader
        useActionButton
        title={conversation?.user.name || 'User'}
        subtitle={`@${conversation?.user.username || ''}`}
        action={back}
      >
        {conversation?.user.photoURL && (
          <a href={`/${conversation?.user.username}`} className="mr-2">
            <img
              src={conversation?.user.photoURL}
              alt={`${conversation?.user.name}'s profile`}
              className="h-8 w-8 rounded-full border-2 border-white"
            />
          </a>
        )}
        <Button
          onClick={handleDeleteConversation}
          className="text-red-500 ml-auto"
        >
          Delete Conversation
        </Button>
      </MainHeader>

      {loading ? (
        <Loading />
      ) : (
        <div className="flex-grow overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {data && data.length > 0 &&
              data
                .sort((a, b) => (a.createdAt as any)?.seconds - (b.createdAt as any)?.seconds)
                .map((message, index) => {
                  const prevMessage = data[index - 1];
                  const isNewDay = prevMessage && new Date(prevMessage.createdAt.seconds * 1000).toDateString() !== new Date(message.createdAt.seconds * 1000).toDateString();

                  return (
                    <div key={message.id}>
                      {isNewDay && renderDateSeparator(new Date(message.createdAt.seconds * 1000))}
                      <motion.div
                        {...variants}
                        className={cn(
                          'flex flex-col',
                          message.userId === user?.id ? 'items-end' : 'items-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-xs rounded-lg px-4 py-2',
                            message.userId === user?.id
                              ? 'bg-blue-500 text-white rounded-br-none'
                              : 'bg-gray-700 text-white rounded-bl-none'
                          )}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: twemojiParseWithLinks(message.text, 'text-white'),
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">
                          {new Date(message.createdAt.seconds * 1000).toLocaleTimeString()}
                        </span>
                      </motion.div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Message input form */}
      <form className="flex items-center p-4 bg-gray-900" onSubmit={handleSendMessage}>
        <input
          className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 outline-none"
          placeholder="Send a message"
          value={inputValue}
          onChange={(e) => setInputValue(emoji.emojify(e.target.value))}
        />
        <Button
          type="submit"
          className="ml-2 bg-blue-500 text-white rounded-full p-2"
        >
          <BiNavigation className="text-white" />
        </Button>
      </form>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          title="Delete Conversation"
          description="Are you sure you want to delete this conversation? This action cannot be undone."
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </main>
  );
}

MessagePage.getLayout = (page: ReactElement): ReactNode => (
  <ProtectedLayout>
    <MainLayoutWithoutSidebar>
      <MessageLayout>{page}</MessageLayout>
    </MainLayoutWithoutSidebar>
  </ProtectedLayout>
);
