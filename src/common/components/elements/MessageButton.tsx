import { useMakeConnection } from '@/common/hooks/useMakeConnection';
import { useRevokeConnection } from '@/common/hooks/useRevokeConnection';
import { IProfile } from '@/modules/feed/feed.interfaces';
import { useAnalytics } from '@/common/context/AnalyticsProvider';
import { showFirstAndLastFour } from '@/modules/utils/string';
import { useWallet, AnchorWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import React, { FC } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { Button5 } from './Button2';
import { FailureToast } from './FailureToast';
import { SuccessToast } from './SuccessToast';

type MessageButtonProps = {
  source: 'modalFrom' | 'modalTo' | 'profileButton';
  // walletConnectionPair: {
  //  wallet: AnchorWallet;
  //   connection: Connection;
  // };
  toProfile: IProfile;
  type: 'Follow' | 'Unfollow';
};

export const MessageButton: FC<MessageButtonProps> = ({
  source,
  walletConnectionPair,
  toProfile,
  type,
}) => {

  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  // const { connection, wallet } = walletConnectionPair;
  const wallet = useAnchorWallet()!;
  console.log('wallet', wallet);
  const myWallet = wallet.publicKey.toBase58();
  const toWallet = toProfile.pubkey;

  const sharedTrackingParams = {
    source,
    event_category: 'Profile',
    event_label: 'profile',
    from: myWallet,
    to: toWallet,
  } as const;

  const trackInitiateTransaction = () => track(type + ' initiated', sharedTrackingParams);
  const trackSuccess = () => track(type + ' succeeded', sharedTrackingParams);
  const trackError = () => track(type + ' errored', sharedTrackingParams);

  const connectTo = useMakeConnection(walletConnectionPair, {
    onSuccess: async (txId, toWallet) => {
      toast(
        <SuccessToast>
          Confirming transaction:&nbsp;
          <a
            className="font-bold underline"
            href={`https://explorer.solana.com/tx/${txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {showFirstAndLastFour(txId)}
          </a>
        </SuccessToast>,
        { autoClose: 13_000 }
      );
      await connection.confirmTransaction(txId, 'processed');
      await queryClient.invalidateQueries();
      trackSuccess();
      toast(
        <SuccessToast>
          Followed: {showFirstAndLastFour(toWallet)}, TX:&nbsp;
          <a
            className="font-bold underline"
            href={`https://explorer.solana.com/tx/${txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {showFirstAndLastFour(txId)}
          </a>
        </SuccessToast>
      );
    },
    onError: (error, toWallet) => {
      console.error(error);
      trackError();
      toast(<FailureToast>Unable to follow, try again later.</FailureToast>);
    },
  });

  const disconnectTo = useRevokeConnection(walletConnectionPair, {
    onSuccess: async (txId, toWallet) => {
      toast(
        <SuccessToast>
          Confirming transaction:&nbsp;
          <a
            className="font-bold underline"
            href={`https://explorer.solana.com/tx/${txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {showFirstAndLastFour(txId)}
          </a>
        </SuccessToast>,
        { autoClose: 13_000 }
      );
      await connection.confirmTransaction(txId, 'processed');
      await queryClient.invalidateQueries();

      trackSuccess();
      toast(
        <SuccessToast>
          Unfollowed: {showFirstAndLastFour(toWallet)}, TX:&nbsp;
          <a
            className="font-bold underline"
            href={`https://explorer.solana.com/tx/${txId}`}
            target="_blank"
            rel="noreferrer"
          >
            {showFirstAndLastFour(txId)}
          </a>
        </SuccessToast>
      );
    },
    onError: (error, toWallet) => {
      console.error(error);
      trackError();
      toast(<FailureToast>Unable to unfollow, try again later.</FailureToast>);
    },
  });

  const handleClick = (pubKeyOverride?: string) => {
    const pk = pubKeyOverride ?? toWallet;
    trackInitiateTransaction();

    if (type === 'Follow') {
      connectTo.mutate(pk);
    } else {
      disconnectTo.mutate(pk);
    }
  };

  const loading = connectTo.status === 'loading' || disconnectTo.status === 'loading';

  return type === 'Follow' ? (
    <Button5 v="primary" className="h-10 w-28" onClick={() => handleClick()} loading={loading}>
      Follow
    </Button5>
  ) : (
    <Button5 v="secondary" className="h-10 w-28" onClick={() => handleClick()} loading={loading}>
      Unfollow
    </Button5>
  );
};
