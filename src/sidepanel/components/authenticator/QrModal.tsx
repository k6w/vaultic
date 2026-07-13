import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import type { TwoFactorAccount } from '@shared/types';
import { buildOtpauthUri, toQrDataUrl } from '@shared/qr';
import { Modal, Spinner, Button } from '@shared/ui';

/** Shows a scannable otpauth QR so an account can be moved to a phone. */
export default function QrModal({
  account,
  onClose,
}: {
  account: TwoFactorAccount;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const uri = buildOtpauthUri(account);

  useEffect(() => {
    let ok = true;
    toQrDataUrl(uri, 240).then((u) => ok && setDataUrl(u));
    return () => {
      ok = false;
    };
  }, [uri]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Move to another device"
      description={`Scan this with another authenticator to copy ${account.issuer}.`}
      size="sm"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-xl bg-surface-2 p-3">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Account QR code"
              width={224}
              height={224}
              className={revealed ? '' : 'blur-md'}
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center">
              <Spinner size={22} />
            </div>
          )}
        </div>

        {!revealed ? (
          <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-warning">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">
              This QR contains your secret in plain form. Reveal it only where no one can
              see your screen.
            </p>
          </div>
        ) : null}

        <Button
          variant={revealed ? 'secondary' : 'primary'}
          size="sm"
          block
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? (
            <>
              <EyeOff size={15} /> Hide code
            </>
          ) : (
            <>
              <Eye size={15} /> Reveal QR
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
