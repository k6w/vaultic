import { useState, useCallback } from 'react';
import { useVault } from '@hooks/useVault';
import { useMail } from '@hooks/useMail';
import MailAccountList from './MailAccountList';
import Inbox from './Inbox';
import MessageViewer from './MessageViewer';
import CreateMailAccount from './CreateMailAccount';

type MailView = 'accounts' | 'inbox' | 'message';

export default function MailTab() {
  const { vault, refetch } = useVault();
  const { deleteAccount } = useMail();
  const mailAccounts = vault?.mailAccounts ?? [];

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedAccount = mailAccounts.find((a) => a.id === selectedAccountId) ?? null;

  // Determine which view to show
  let view: MailView = 'accounts';
  if (selectedAccountId && selectedMessageId) view = 'message';
  else if (selectedAccountId) view = 'inbox';

  const handleSelectAccount = useCallback((id: string) => {
    setSelectedAccountId(id);
    setSelectedMessageId(null);
  }, []);

  const handleSelectMessage = useCallback((id: string) => {
    setSelectedMessageId(id);
  }, []);

  const handleBackToAccounts = useCallback(() => {
    setSelectedAccountId(null);
    setSelectedMessageId(null);
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
        <div className="w-14 h-14 rounded-2xl bg-gray-800/80 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-500">
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-base font-medium text-gray-300 mb-1">Temporary Email</p>
        <p className="text-sm text-gray-500 mb-5">Create a disposable email address</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Email
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

  return (
    <div className="flex flex-col h-full">
      {/* Account List View */}
      {view === 'accounts' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
            <h1 className="text-base font-semibold text-white">Mail Accounts</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 px-2.5 py-1.5 rounded-md transition-colors duration-150"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>

          {/* Accounts */}
          <MailAccountList
            accounts={mailAccounts}
            selectedId={selectedAccountId}
            onSelect={handleSelectAccount}
            onDelete={handleDeleteAccount}
          />
        </>
      )}

      {/* Inbox View */}
      {view === 'inbox' && selectedAccount && (
        <Inbox
          accountId={selectedAccountId!}
          account={selectedAccount}
          onSelectMessage={handleSelectMessage}
          onBack={handleBackToAccounts}
        />
      )}

      {/* Message View */}
      {view === 'message' && (
        <MessageViewer
          accountId={selectedAccountId!}
          messageId={selectedMessageId!}
          onBack={handleBackToInbox}
        />
      )}

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
