
import { providers, utils } from "ethers";
import { useEffect, useState } from "react";

const AVALANCHE_CHAIN_ID = "0xA86A";

const AVALANCHE_NETWORK = {
  chainId: AVALANCHE_CHAIN_ID,
  chainName: "Avalanche C-Chain",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  blockExplorerUrls: ["https://snowtrace.io/"],
};

export const _isMetaMaskInstalled = () => {
  if (typeof window === "undefined") return false;

  const { ethereum } = window;
  return Boolean(ethereum && ethereum.isMetaMask);
};

export const _getProvider = () => {
  if (!_isMetaMaskInstalled()) return null;

  return new providers.Web3Provider(window.ethereum);
};

export const _getChain = async () => {
  const provider = _getProvider();

  if (!provider) return -1;

  return `${(await provider.getNetwork()).chainId}`;
};

const _onAccountsChanged = (callback) => {
  if (!_isMetaMaskInstalled()) return;

  window.ethereum.on("accountsChanged", callback);
};

const _onChainChanged = (callback) => {
  if (!_isMetaMaskInstalled()) return;

  window.ethereum.on("chainChanged", callback);
};

export const _getAddress = async () => {
  const provider = _getProvider();

  if (!provider) return null;

  try {
    const accounts = await provider.listAccounts();

    return accounts.length > 0 ? accounts[0] : null;
  } catch (e) {
    return null;
  }
};

export const WalletHook = () => {
  const [wallet, setWallet] = useState(null);
  const [chain, setChain] = useState(-1);

  useEffect(() => {
    const load = async () => {
      try {
        setWallet((await _getAddress())?.toLowerCase());
        setChain(await _getChain());
      } catch (error) {
        console.error(error);
      }
    };

    const handleAccountsChanged = (accounts) => {
      setWallet(accounts.length > 0 ? accounts[0].toLowerCase() : null);
    };

    const handleChainChanged = (newChain) => {
      setChain(`${parseInt(newChain, 16)}`);
    };

    _onAccountsChanged(handleAccountsChanged);
    _onChainChanged(handleChainChanged);

    load();

    return () => {
      if (_isMetaMaskInstalled()) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );

        window.ethereum.removeListener(
          "chainChanged",
          handleChainChanged
        );
      }
    };
  }, []);

  return {
    wallet,
    chain,
  };
};

// Switch to Avalanche C-Chain
export const switchToAvalanche = async () => {
  if (!_isMetaMaskInstalled()) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AVALANCHE_CHAIN_ID }],
    });

    return true;
  } catch (error) {
    // Network is not added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [AVALANCHE_NETWORK],
        });

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: AVALANCHE_CHAIN_ID }],
        });

        return true;
      } catch (addError) {
        console.error("Failed to add Avalanche network:", addError);
        return false;
      }
    }

    console.error("Failed to switch to Avalanche:", error);
    return false;
  }
};

// Connect wallet and automatically switch to Avalanche
export const connectMetamask = async () => {
  if (!_isMetaMaskInstalled()) return false;

  try {
    // Request wallet connection
    await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Automatically switch to Avalanche
    const switched = await switchToAvalanche();

    if (!switched) return false;

    return true;
  } catch (error) {
    console.error("MetaMask connection failed:", error);
    return false;
  }
};

// Keep old function name for compatibility
export const switchToMainnet = switchToAvalanche;

export const watchTransaction = (txHash, callback) => {
  const provider = _getProvider();

  if (!provider) return;

  provider.once(txHash, (transaction) => {
    callback(transaction, transaction.status === 1);
  });
};

export const parseBigNumber = (bn, decimals = 2) => {
  if (!bn) return 0;

  try {
    return numberWithCommas(
      parseFloat(utils.formatUnits(bn, "gwei")).toFixed(decimals)
    );
  } catch (e) {
    return bn;
  }
};

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
