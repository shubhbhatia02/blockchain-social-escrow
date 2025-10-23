import { useState } from 'react';
import { ethers } from 'ethers';
import contractAddress from './contracts/contract-address.json';
import EscrowFactoryArtifact from './contracts/EscrowFactory.json';
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
    </div>
  );
}

export default App;
