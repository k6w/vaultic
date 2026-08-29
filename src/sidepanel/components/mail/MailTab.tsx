import { useState, useCallback } from 'react';
import { Mail, Plus } from 'lucide-react';
import { useVault } from '@hooks/useVault';
import { useMail } from '@hooks/useMail';
import { Button, EmptyState } from '@shared/ui';
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
      <div className="flex flex-col h-full">
        <EmptyState
          className="h-full"
          icon={<Mail size={26} />}
          title="Temporary Email"
          description="Create a disposable inbox to sign up anywhere without exposing your real address."
          action={
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              Create Email
            </Button>
          }
        />
        <p className="pb-3 text-center text-[10px] text-text-muted">Inbox service provided by <a className="underline" href="https://mail.tm" target="_blank" rel="noreferrer">mail.tm</a></p>

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
          <header className="flex items-center justify-between px-4 h-14 border-b border-border">
            <h1 className="font-display text-base font-semibold text-text">Mail Accounts</h1>
            <Button size="sm" variant="soft" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} />
              New
            </Button>
          </header>

          {/* Accounts */}
          <MailAccountList
            accounts={mailAccounts}
            selectedId={selectedAccountId}
            onSelect={handleSelectAccount}
            onDelete={handleDeleteAccount}
          />
          <p className="pb-3 text-center text-[10px] text-text-muted">Inbox service provided by <a className="underline" href="https://mail.tm" target="_blank" rel="noreferrer">mail.tm</a></p>
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
