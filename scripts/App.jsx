import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractAddress from '../src/contracts/contract-address.json';
import EscrowFactoryArtifact from '../src/contracts/EscrowFactory.json';
import EscrowArtifact from '../../../artifacts/contracts/Escrow.sol/Escrow.json';
import './App.css';

const FACTORY_ADDRESS = contractAddress.EscrowFactory;

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [kolAddress, setKolAddress] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [deals, setDeals] = useState([]);
  const [isFetchingDeals, setIsFetchingDeals] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setProvider(provider);
        setAccount(accounts[0]);
        setNotification('Wallet connected successfully!');
      } catch (error) {
        console.error("Error connecting wallet:", error);
        setNotification('Failed to connect wallet.');
      }
    } else {
      setNotification('MetaMask is not installed. Please install it to use this app.');
    }
  };

  const fetchDeals = async () => {
    if (!provider) return;
    setIsFetchingDeals(true);
    setNotification("Fetching existing deals...");
    try {
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, EscrowFactoryArtifact.abi, provider);
      const dealFilter = factoryContract.filters.DealCreated();
      const dealEvents = await factoryContract.queryFilter(dealFilter);

      const dealsData = await Promise.all(
        dealEvents.map(async (event) => {
          const [escrowAddress, founder, kol, amount, xHandle, nonce] = event.args;
          const escrowContract = new ethers.Contract(escrowAddress, EscrowArtifact.abi, provider);
          const status = await escrowContract.status();
          return {
            escrowAddress,
            founder,
            kol,
            amount: ethers.formatEther(amount),
            xHandle,
            nonce,
            status: Number(status) // Convert BigInt to number for easier comparison
          };
        })
      );
      setDeals(dealsData.reverse()); // Show newest deals first
      setNotification("Deals loaded.");
    } catch (error) {
      console.error("Error fetching deals:", error);
      setNotification("Could not fetch deals.");
    } finally {
      setIsFetchingDeals(false);
    }
  };

  // Fetch deals when the wallet is connected
  useEffect(() => {
    if (provider) {
      fetchDeals();

      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, EscrowFactoryArtifact.abi, provider);
      factoryContract.on("DealCreated", fetchDeals); // Re-fetch when a new deal is made
    }
  }, [provider]);

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!provider || !account) {
      setNotification('Please connect your wallet first.');
      return;
    }

    if (!ethers.isAddress(FACTORY_ADDRESS)) {
      setNotification('Please update the factory address in the code.');
      return;
    }

    setLoading(true);
    setNotification('Processing transaction...');

    try {
      const signer = await provider.getSigner();
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, EscrowFactoryArtifact.abi, signer);

      // For local Hardhat testing, the 3rd account is always the same.
      // provider.listAccounts() in the browser only returns the connected account, not all node accounts.
      const verifierAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

      const tx = await factoryContract.createEscrow(
        kolAddress,
        xHandle,
        verifierAddress,
        { value: ethers.parseEther(amount) }
      );

      await tx.wait();
      setNotification(`Deal created successfully! Tx: ${tx.hash}`);
    } catch (error) {
      console.error("Error creating deal:", error);
      setNotification(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (escrowAddress) => {
    setLoading(true);
    setNotification(`Withdrawing from ${escrowAddress.substring(0, 6)}...`);
    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, EscrowArtifact.abi, signer);
      const tx = await escrowContract.withdraw();
      await tx.wait();
      setNotification("Withdrawal successful!");
      fetchDeals(); // Refresh the list of deals
    } catch (error) {
      console.error("Error withdrawing:", error);
      setNotification(`Withdrawal failed: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusToString = (status) => {
    switch (status) {
      case 0: return "Active";
      case 1: return "Released (Ready to Withdraw)";
      case 2: return "Refunded (Ready to Withdraw)";
      case 3: return "Completed";
      default: return "Unknown";
    }
  };

  return (
    <div className="App">
      <h1>Social Escrow MVP</h1>
      {account ? (
        <div>
          <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
          <form onSubmit={handleCreateDeal} className="deal-form">
            <h2>Create a New Deal</h2>
            <input type="text" value={kolAddress} onChange={(e) => setKolAddress(e.target.value)} placeholder="KOL Wallet Address" required />
            <input type="text" value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="KOL X Handle (no @)" required />
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in ETH" required />
            <button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Create Deal'}</button>
          </form>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
      {notification && <p className="notification">{notification}</p>}

      <div className="deals-container">
        <h2>Deals</h2>
        <button onClick={fetchDeals} disabled={isFetchingDeals || !provider}>
          {isFetchingDeals ? 'Refreshing...' : 'Refresh Deals'}
        </button>
        <div className="deals-list">
          {deals.length === 0 && <p>No deals found.</p>}
          {deals.map((deal) => (
            <div key={deal.escrowAddress} className="deal-card">
              <p><strong>KOL:</strong> {deal.kol.substring(0, 6)}... | <strong>Founder:</strong> {deal.founder.substring(0, 6)}...</p>
              <p><strong>Amount:</strong> {deal.amount} ETH</p>
              <p><strong>Status:</strong> {statusToString(deal.status)}</p>
              {/* Show withdraw button for the KOL if funds are released */}
              {deal.status === 1 && deal.kol.toLowerCase() === account?.toLowerCase() && (
                <button onClick={() => handleWithdraw(deal.escrowAddress)} disabled={loading}>
                  Withdraw as KOL
                </button>
              )}
              {/* Show withdraw button for the Founder if funds are refunded */}
              {deal.status === 2 && deal.founder.toLowerCase() === account?.toLowerCase() && (
                <button onClick={() => handleWithdraw(deal.escrowAddress)} disabled={loading}>
                  Withdraw as Founder
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
