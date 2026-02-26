import { useState, useCallback } from 'react';
import { useVault } from '@hooks/useVault';
import { useMail } from '@hooks/useMail';
import MailAccountList from './MailAccountList';
import Inbox from './Inbox';
import MessageViewer from './MessageViewer';
import CreateMailAccount from './CreateMailAccount';

export default function MailTab() {
  const { vault, refetch } = useVault();
  const { deleteAccount } = useMail();
  const mailAccounts = vault?.mailAccounts ?? [];

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedAccount = mailAccounts.find((a) => a.id === selectedAccountId) ?? null;

  const handleSelectAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
    setSelectedMessageId(null);
  }, []);

  const handleSelectMessage = useCallback((id: string) => {
    setSelectedMessageId(id);
  }, []);

  const handleBackToInbox = useCallback(() => {
    setSelectedMessageId(null);
  }, []);

  const handleDeleteAccount = useCallback(async (id: string) => {
    const success = await deleteAccount(id);
    if (success) {
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
        setSelectedMessageId(null);
      }
      refetch();
    }
  }, [deleteAccount, selectedAccountId, refetch]);

  const handleAccountCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  // Empty state: no mail accounts
  if (mailAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            className="text-gray-500"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="22,6 12,13 2,6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-300 mb-1">Temporary Email</p>
        <p className="text-sm text-gray-500 mb-5">Create your first temporary email to get started</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Email Account
        </button>

        {showCreateModal && (
          <CreateMailAccount
            onClose={() => setShowCreateModal(false)}
            onCreated={handleAccountCreated}
          />
        )}
      </div>
    );
  }

  // Has accounts: two-column layout
  return (
    <div className="flex h-full">
      {/* Left sidebar: account list */}
      <div className="flex flex-col w-60 flex-shrink-0 border-r border-gray-800 bg-gray-900/50">
        {/* Account list header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accounts</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1 rounded-md text-gray-400 hover:text-emerald-400 hover:bg-gray-800 transition-colors duration-150"
            title="Create new account"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Account list */}
        <MailAccountList
          accounts={mailAccounts}
          selectedId={selectedAccountId}
          onSelect={handleSelectAccount}
          onDelete={handleDeleteAccount}
        />
      </div>

      {/* Right content area */}
      <div className="flex-1 min-w-0">
        {!selectedAccount ? (
          /* No account selected */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-700 mb-3"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="22,6 12,13 2,6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-500">Select an account to view inbox</p>
          </div>
        ) : selectedMessageId ? (
          /* Viewing a message */
          <MessageViewer
            accountId={selectedAccountId!}
            messageId={selectedMessageId}
            onBack={handleBackToInbox}
          />
        ) : (
          /* Viewing inbox */
          <Inbox
            accountId={selectedAccountId!}
            account={selectedAccount}
            onSelectMessage={handleSelectMessage}
          />
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <CreateMailAccount
          onClose={() => setShowCreateModal(false)}
          onCreated={handleAccountCreated}
        />
      )}
    </div>
  );
}
