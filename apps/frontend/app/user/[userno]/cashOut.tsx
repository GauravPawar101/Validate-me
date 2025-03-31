import { useState } from "react";
import ReactDOM from "react-dom";
import { useWallet } from "../../WalletContext";
import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { Loader2, X } from "lucide-react";
import withdrawAmount from "@/hooks/cashOut";

const RPC_URL = "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");
const TOKEN_MINT = new PublicKey("mnt8WiuJQLbyomDX6iKKVLx8Jj4iUd5sUAU5Y4H8yq4");
const sec_arr = [112, 134, 5, 93, 220, 160, 85, 178, 113, 223, 238, 84, 32, 137, 181, 109, 235, 4, 230, 187, 171, 144, 223, 189, 239, 74, 42, 60, 99, 117, 118, 125, 12, 6, 171, 92, 253, 132, 117, 165, 184, 4, 217, 155, 232, 0, 208, 182, 29, 72, 252, 128, 134, 33, 238, 69, 153, 79, 56, 186, 30, 242, 223, 52];
const secretKey = new Uint8Array(sec_arr);
const ownerWallet = Keypair.fromSecretKey(secretKey);

const CashOutModal = ({ isOpen, onClose, getToken , updateEarnings}) => {
  const { walletAddress } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  if (!isOpen) return null;
  
  const handleCashOut = async () => {
    if (!walletAddress) return alert("No wallet detected!");
    if (Number(amount) <= 0) return alert("Enter a valid amount!");

    setIsLoading(true);
    let token;

    try {
      if (typeof getToken === "function") {
        token = await getToken();
      } else {
        throw new Error("getToken function is not provided or not a function");
      }
      
      if (!token) {
        throw new Error("Token retrieval failed. Unable to update the server.");
      }

      const response = await withdrawAmount(Number(amount), getToken);
        if (response?.updatedTotal) {
          updateEarnings(response.updatedTotal); 
        }

    } catch (error) {
      alert(`Token retrieval or server update failed: ${error.message}`);
      setIsLoading(false);
      return;
    }

    try {
      const recipientPublicKey = new PublicKey(walletAddress);
      const userTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        recipientPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const ownerTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        ownerWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      try {
        await getAccount(connection, userTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
      } catch {
        const createUserTokenAccountIx = createAssociatedTokenAccountIdempotentInstruction(
          ownerWallet.publicKey,
          userTokenAccount,
          recipientPublicKey,
          TOKEN_MINT,
          TOKEN_2022_PROGRAM_ID
        );
        const createTx = new Transaction().add(createUserTokenAccountIx);
        await sendAndConfirmTransaction(connection, createTx, [ownerWallet]);
      }

      const senderAccountInfo = await getAccount(connection, ownerTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
      const senderBalance = Number(senderAccountInfo.amount);
      const transferAmount = Number(amount) * 10 ** 9;

      if (senderBalance < transferAmount) {
        setIsLoading(false);
        return alert("Not enough tokens!");
      }

      const transaction = new Transaction().add(
        createTransferCheckedInstruction(
          ownerTokenAccount,
          TOKEN_MINT,
          userTokenAccount,
          ownerWallet.publicKey,
          transferAmount,
          9,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      const signature = await sendAndConfirmTransaction(connection, transaction, [ownerWallet]);
      alert(`Cash-out successful! Tx: ${signature}`);
      onClose();
    } catch (error) {
      alert(`Cash-out failed! ${error.message}`);
    }

    setIsLoading(false);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#8B7355]">Cash Out</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-zinc-300 text-sm mb-4">Connected Wallet: {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none mb-4"
        />
        <button
          onClick={handleCashOut}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-[#8B7355] text-white rounded-lg"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cash Out"}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default CashOutModal;
