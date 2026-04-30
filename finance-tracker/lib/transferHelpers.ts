import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";

type Wallet = {
  id: string;
  wallet_name: string;
  current_balance: number | null;
  currency?: string | null;
};

type TransferRow = {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  currency: string;
  transfer_date: string;
  note: string | null;
  outgoing_transaction_id: string | null;
  incoming_transaction_id: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export async function createTransfer(params: {
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  transferDate: string;
  note?: string;
}) {
  const { userId, fromWalletId, toWalletId, amount, transferDate, note } = params;

  if (fromWalletId === toWalletId) {
    throw new Error("Source and destination wallet cannot be the same.");
  }

  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const { data: walletRows, error: walletError } = await supabase
    .from("wallets")
    .select("id, wallet_name, current_balance, currency")
    .in("id", [fromWalletId, toWalletId]);

  if (walletError) throw walletError;

  const wallets = (walletRows ?? []) as Wallet[];
  const fromWallet = wallets.find((wallet) => wallet.id === fromWalletId);
  const toWallet = wallets.find((wallet) => wallet.id === toWalletId);

  if (!fromWallet || !toWallet) {
    throw new Error("Selected wallet not found.");
  }

  const fromWalletBalance = Number(fromWallet.current_balance || 0);

  if (amount > fromWalletBalance) {
    throw new Error("Not enough balance in source wallet.");
  }

  const transferCurrency = fromWallet.currency || toWallet.currency || "MYR";

  const { data: outgoingTx, error: outgoingError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      wallet_id: fromWalletId,
      title: `Transfer to ${toWallet.wallet_name}`,
      transaction_type: "expense",
      category: "Transfer",
      amount,
      currency: transferCurrency,
      note: note?.trim() || null,
      transaction_date: transferDate,
    })
    .select("id")
    .single();

  if (outgoingError || !outgoingTx) {
    throw outgoingError || new Error("Failed to create outgoing transfer transaction.");
  }

  const { data: incomingTx, error: incomingError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      wallet_id: toWalletId,
      title: `Transfer from ${fromWallet.wallet_name}`,
      transaction_type: "income",
      category: "Transfer",
      amount,
      currency: transferCurrency,
      note: note?.trim() || null,
      transaction_date: transferDate,
    })
    .select("id")
    .single();

  if (incomingError || !incomingTx) {
    throw incomingError || new Error("Failed to create incoming transfer transaction.");
  }

  const { error: transferError } = await supabase.from("transfers").insert({
    user_id: userId,
    from_wallet_id: fromWalletId,
    to_wallet_id: toWalletId,
    amount,
    currency: transferCurrency,
    transfer_date: transferDate,
    note: note?.trim() || null,
    outgoing_transaction_id: outgoingTx.id,
    incoming_transaction_id: incomingTx.id,
  });

  if (transferError) {
    throw transferError;
  }

  await recalculateWalletBalance(fromWalletId);
  await recalculateWalletBalance(toWalletId);
}

export async function updateTransfer(params: {
  transferId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  transferDate: string;
  note?: string;
}) {
  const { transferId, fromWalletId, toWalletId, amount, transferDate, note } = params;

  if (fromWalletId === toWalletId) {
    throw new Error("Source and destination wallet cannot be the same.");
  }

  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const { data: originalTransfer, error: originalTransferError } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (originalTransferError || !originalTransfer) {
    throw originalTransferError || new Error("Transfer not found.");
  }

  const transfer = originalTransfer as TransferRow;

  const { data: walletRows, error: walletError } = await supabase
    .from("wallets")
    .select("id, wallet_name, current_balance, currency")
    .in("id", [fromWalletId, toWalletId]);

  if (walletError) throw walletError;

  const wallets = (walletRows ?? []) as Wallet[];
  const fromWallet = wallets.find((wallet) => wallet.id === fromWalletId);
  const toWallet = wallets.find((wallet) => wallet.id === toWalletId);

  if (!fromWallet || !toWallet) {
    throw new Error("Selected wallet not found.");
  }

  const oldFromWalletId = transfer.from_wallet_id;
  const oldToWalletId = transfer.to_wallet_id;

  const recalculationPreview =
    fromWalletId === oldFromWalletId
      ? Number(fromWallet.current_balance || 0) + Number(transfer.amount || 0)
      : Number(fromWallet.current_balance || 0);

  if (amount > recalculationPreview) {
    throw new Error("Not enough balance in source wallet.");
  }

  const transferCurrency = fromWallet.currency || toWallet.currency || "MYR";

  if (transfer.outgoing_transaction_id) {
    const { error: outgoingUpdateError } = await supabase
      .from("transactions")
      .update({
        wallet_id: fromWalletId,
        title: `Transfer to ${toWallet.wallet_name}`,
        transaction_type: "expense",
        category: "Transfer",
        amount,
        currency: transferCurrency,
        note: note?.trim() || null,
        transaction_date: transferDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transfer.outgoing_transaction_id);

    if (outgoingUpdateError) throw outgoingUpdateError;
  }

  if (transfer.incoming_transaction_id) {
    const { error: incomingUpdateError } = await supabase
      .from("transactions")
      .update({
        wallet_id: toWalletId,
        title: `Transfer from ${fromWallet.wallet_name}`,
        transaction_type: "income",
        category: "Transfer",
        amount,
        currency: transferCurrency,
        note: note?.trim() || null,
        transaction_date: transferDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transfer.incoming_transaction_id);

    if (incomingUpdateError) throw incomingUpdateError;
  }

  const { error: transferUpdateError } = await supabase
    .from("transfers")
    .update({
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      amount,
      currency: transferCurrency,
      transfer_date: transferDate,
      note: note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (transferUpdateError) throw transferUpdateError;

  const walletIdsToRecalculate = Array.from(
    new Set([oldFromWalletId, oldToWalletId, fromWalletId, toWalletId])
  );

  for (const walletId of walletIdsToRecalculate) {
    await recalculateWalletBalance(walletId);
  }
}

export async function deleteTransfer(transferId: string) {
  const { data: transferRow, error: transferError } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (transferError || !transferRow) {
    throw transferError || new Error("Transfer not found.");
  }

  const transfer = transferRow as TransferRow;

  if (transfer.outgoing_transaction_id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transfer.outgoing_transaction_id);

    if (error) throw error;
  }

  if (transfer.incoming_transaction_id) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transfer.incoming_transaction_id);

    if (error) throw error;
  }

  const { error: deleteTransferError } = await supabase
    .from("transfers")
    .delete()
    .eq("id", transferId);

  if (deleteTransferError) throw deleteTransferError;

  await recalculateWalletBalance(transfer.from_wallet_id);
  await recalculateWalletBalance(transfer.to_wallet_id);
}

export { getErrorMessage };