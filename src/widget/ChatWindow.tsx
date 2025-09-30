import { useState, useRef, useEffect } from 'react';
import { useNostr } from './useNostr';

interface ChatWindowProps {
  projectId: string;
  onClose: () => void;
}

export function ChatWindow({ projectId, onClose }: ChatWindowProps) {
  const [nsecInput, setNsecInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [authError, setAuthError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    isLoading,
    isAuthenticated,
    messages,
    authenticate,
    sendMessage,
    logout,
  } = useNostr(projectId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!nsecInput.trim()) {
      setAuthError('Please enter your nsec');
      return;
    }

    const success = await authenticate(nsecInput);
    if (!success) {
      setAuthError('Invalid nsec. Please check and try again.');
    } else {
      setNsecInput('');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim()) return;

    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setNsecInput('');
  };

  return (
    <div className="fixed bottom-20 right-4 w-96 h-[32rem] bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            TENEX Widget
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
          Connecting to Nostr relays...
        </div>
      )}

      {/* Authentication Form */}
      {isConnected && !isAuthenticated && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Sign in to continue
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter your Nostr private key (nsec) to send messages
            </p>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={nsecInput}
                  onChange={(e) => setNsecInput(e.target.value)}
                  placeholder="nsec1..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {authError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {authError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {isConnected && isAuthenticated && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                Loading messages...
              </div>
            )}
            {!isLoading && messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                No messages yet. Start the conversation!
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.isFromUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.isFromUser
                        ? 'text-blue-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {new Date(message.created_at * 1000).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
              >
                Send
              </button>
            </form>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}