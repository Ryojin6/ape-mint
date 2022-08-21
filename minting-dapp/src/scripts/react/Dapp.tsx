import React from "react";
import { ethers, BigNumber } from "ethers";
import { ExternalProvider, Web3Provider } from "@ethersproject/providers";
import detectEthereumProvider from "@metamask/detect-provider";
import NftContractType from "../lib/NftContractType";
import CollectionConfig from "../../../../smart-contract/config/CollectionConfig";
import NetworkConfigInterface from "../../../../smart-contract/lib/NetworkConfigInterface";
import CollectionStatus from "./CollectionStatus";
import MintWidget from "./MintWidget";
import Whitelist from "../lib/Whitelist";
import { toast } from "react-toastify";

const ContractAbi = require("../../../../smart-contract/artifacts/contracts/" +
  CollectionConfig.contractName +
  ".sol/" +
  CollectionConfig.contractName +
  ".json").abi;

interface Props {}

interface State {
  userAddress: string | null;
  network: ethers.providers.Network | null;
  networkConfig: NetworkConfigInterface;
  totalSupply: number;
  maxSupply: number;
  maxMintAmountPerTx: number;
  tokenPrice: BigNumber;
  isPaused: boolean;
  loading: boolean;
  isWhitelistMintEnabled: boolean;
  isUserInWhitelist: boolean;
  merkleProofManualAddress: string;
  merkleProofManualAddressFeedbackMessage: string | JSX.Element | null;
  errorMessage: string | JSX.Element | null;
}

const defaultState: State = {
  userAddress: null,
  network: null,
  networkConfig: CollectionConfig.mainnet,
  totalSupply: 0,
  maxSupply: 0,
  maxMintAmountPerTx: 0,
  tokenPrice: BigNumber.from(0),
  isPaused: true,
  loading: false,
  isWhitelistMintEnabled: false,
  isUserInWhitelist: false,
  merkleProofManualAddress: "",
  merkleProofManualAddressFeedbackMessage: null,
  errorMessage: null,
};

export default class Dapp extends React.Component<Props, State> {
  provider!: Web3Provider;

  contract!: NftContractType;

  private merkleProofManualAddressInput!: HTMLInputElement;

  constructor(props: Props) {
    super(props);

    this.state = defaultState;
  }

  componentDidMount = async () => {
    const browserProvider =
      (await detectEthereumProvider()) as ExternalProvider;

    if (browserProvider?.isMetaMask !== true) {
      this.setError(
        <>
          We were not able to detect <strong>MetaMask</strong>. We value{" "}
          <strong>privacy and security</strong> a lot so we limit the wallet
          options on the DAPP.
          <br />
          <br />
          But don't worry! <span className="emoji">😃</span> You can always
          interact with the smart-contract through{" "}
          <a href={this.generateContractUrl()} target="_blank">
            {this.state.networkConfig.blockExplorer.name}
          </a>{" "}
          and{" "}
          <strong>
            we do our best to provide you with the best user experience possible
          </strong>
          , even from there.
          <br />
          <br />
          You can also get your <strong>Whitelist Proof</strong> manually, using
          the tool below.
        </>
      );
    }

    this.provider = new ethers.providers.Web3Provider(browserProvider);

    this.registerWalletEvents(browserProvider);

    await this.initWallet();
  };

  async mintTokens(amount: number): Promise<void> {
    try {
      this.setState({ loading: true });
      const transaction = await this.contract.mint(amount, {
        value: this.state.tokenPrice.mul(amount),
      });

      toast.info(
        <>
          Transaction sent! Please wait...
          <br />
          <a
            href={this.generateTransactionUrl(transaction.hash)}
            target="_blank"
            rel="noopener"
          >
            View on {this.state.networkConfig.blockExplorer.name}
          </a>
        </>
      );

      const receipt = await transaction.wait();

      toast.success(
        <>
          Success!
          <br />
          <a
            href={this.generateTransactionUrl(receipt.transactionHash)}
            target="_blank"
            rel="noopener"
          >
            View on {this.state.networkConfig.blockExplorer.name}
          </a>
        </>
      );

      this.refreshContractState();
      this.setState({ loading: false });
    } catch (e) {
      this.setError(e);
      this.setState({ loading: false });
    }
  }

  async whitelistMintTokens(amount: number): Promise<void> {
    try {
      this.setState({ loading: true });
      const transaction = await this.contract.whitelistMint(
        amount,
        Whitelist.getProofForAddress(this.state.userAddress!),
        { value: this.state.tokenPrice.mul(amount) }
      );

      toast.info(
        <>
          Transaction sent! Please wait...
          <br />
          <a
            href={this.generateTransactionUrl(transaction.hash)}
            target="_blank"
            rel="noopener"
          >
            View on {this.state.networkConfig.blockExplorer.name}
          </a>
        </>
      );

      const receipt = await transaction.wait();

      toast.success(
        <>
          Success!
          <br />
          <a
            href={this.generateTransactionUrl(receipt.transactionHash)}
            target="_blank"
            rel="noopener"
          >
            View on {this.state.networkConfig.blockExplorer.name}
          </a>
        </>
      );

      this.refreshContractState();
      this.setState({ loading: false });
    } catch (e) {
      this.setError(e);
      this.setState({ loading: false });
    }
  }

  private isWalletConnected(): boolean {
    return this.state.userAddress !== null;
  }

  private isContractReady(): boolean {
    return this.contract !== undefined;
  }

  private isSoldOut(): boolean {
    return (
      this.state.maxSupply !== 0 &&
      this.state.totalSupply >= this.state.maxSupply
    );
  }

  private isNotMainnet(): boolean {
    return (
      this.state.network !== null &&
      this.state.network.chainId !== CollectionConfig.mainnet.chainId
    );
  }

  private copyMerkleProofToClipboard(): void {
    const merkleProof = Whitelist.getRawProofForAddress(
      this.state.userAddress ?? this.state.merkleProofManualAddress
    );

    if (merkleProof.length < 1) {
      this.setState({
        merkleProofManualAddressFeedbackMessage:
          "The given address is not in the whitelist, please double-check.",
      });

      return;
    }

    navigator.clipboard.writeText(merkleProof);

    this.setState({
      merkleProofManualAddressFeedbackMessage: (
        <>
          <strong>Congratulations!</strong> <span className="emoji">🎉</span>
          <br />
          Your Merkle Proof <strong>has been copied to the clipboard</strong>.
          You can paste it into{" "}
          <a href={this.generateContractUrl()} target="_blank">
            {this.state.networkConfig.blockExplorer.name}
          </a>{" "}
          to claim your tokens.
        </>
      ),
    });
  }

  render() {
    return (
      <>
        {this.isNotMainnet() ? (
          <div className="not-mainnet">
            You are not connected to the main network.
            <span className="small">
              Current network: <strong>{this.state.network?.name}</strong>
            </span>
          </div>
        ) : null}

        {this.state.errorMessage ? (
          <div className="error">
            <p>{this.state.errorMessage}</p>
            <button onClick={() => this.setError()}>Close</button>
          </div>
        ) : null}

        {this.isWalletConnected() ? (
          <>
            {this.isContractReady() ? (
              <>
                <CollectionStatus
                  userAddress={this.state.userAddress}
                  maxSupply={this.state.maxSupply}
                  totalSupply={this.state.totalSupply}
                  isPaused={this.state.isPaused}
                  isWhitelistMintEnabled={this.state.isWhitelistMintEnabled}
                  isUserInWhitelist={this.state.isUserInWhitelist}
                  isSoldOut={this.isSoldOut()}
                />
                {!this.isSoldOut() ? (
                  <MintWidget
                    networkConfig={this.state.networkConfig}
                    maxSupply={this.state.maxSupply}
                    totalSupply={this.state.totalSupply}
                    tokenPrice={this.state.tokenPrice}
                    maxMintAmountPerTx={this.state.maxMintAmountPerTx}
                    isPaused={this.state.isPaused}
                    isWhitelistMintEnabled={this.state.isWhitelistMintEnabled}
                    isUserInWhitelist={this.state.isUserInWhitelist}
                    mintTokens={(mintAmount) => this.mintTokens(mintAmount)}
                    whitelistMintTokens={(mintAmount) =>
                      this.whitelistMintTokens(mintAmount)
                    }
                    loading={this.state.loading}
                  />
                ) : (
                  <div className="collection-sold-out">
                    <h2>
                      Tokens have been <strong>sold out</strong>!{" "}
                      <span className="emoji">🥳</span>
                    </h2>
                    You can buy from our beloved holders on{" "}
                    <a href={this.generateMarketplaceUrl()} target="_blank">
                      {CollectionConfig.marketplaceConfig.name}
                    </a>
                    .
                  </div>
                )}
              </>
            ) : (
              <div className="collection-not-ready">
                <svg
                  className="spinner"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading collection data...
              </div>
            )}
          </>
        ) : (
          <div className="no-wallet">
            <div className="space-y-4 text-white flex flex-col justify-center items-center pb-16 pt-12">
              <div className="transition-all duration-300 ease-in-out w-32 2xl:w-48">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 261.97 262.547"
                >
                  <g fill="#fff" stroke="#be3c54">
                    <path
                      d="M131.078 179.117s-3.868 8.344 1.22 14.493a70.613 70.613 0 0 1-1.22-14.493Z"
                      stroke-dashoffset="99.605"
                      stroke-dasharray="99.605"
                    />
                    <path
                      d="M126.332 157.599s-6.515-3.367-14.93 6.368a8.329 8.329 0 0 1 3.148-.585 13.5 13.5 0 0 0-.95 6.113s3.319-10.868 12.736-11.893Z"
                      stroke-dashoffset="150.605"
                      stroke-dasharray="150.605"
                    />
                    <path
                      d="M122.267 163.143c-5.612 2.641-4.965 7.807-4.425 9.165a5.827 5.827 0 0 1 1.7-1.358c2.306-1.214 4.932-.765 5.864 1 .744 1.409.171 3.223-1.25 4.521 10.2-1.829 2.171-10.622-.312-13.078a1.386 1.386 0 0 0-1.577-.25Z"
                      stroke-dashoffset="148.341"
                      stroke-dasharray="148.341"
                    />
                    <path
                      d="M136.798 157.599c9.417 1.025 12.736 11.893 12.736 11.893a13.513 13.513 0 0 0-.946-6.111 8.4 8.4 0 0 1 3.148.585c-8.419-9.735-14.931-6.368-14.931-6.368Z"
                      stroke-dashoffset="150.603"
                      stroke-dasharray="150.603"
                    />
                    <path
                      d="M140.636 163.143a1.391 1.391 0 0 0-1.577.255c-2.482 2.458-10.511 11.252-.312 13.078-1.424-1.3-1.994-3.112-1.25-4.521.932-1.772 3.559-2.222 5.864-1a5.829 5.829 0 0 1 1.7 1.358c.539-1.363 1.187-6.529-4.425-9.17Z"
                      stroke-dashoffset="148.349"
                      stroke-dasharray="148.349"
                    />
                    <path
                      d="M259.918 82.718c-3.028-1.505-9.966-3.682-24.309-3.16-21.469.78-24-3.978-29.765-20.495-5.93-16.981-8.1-29.765-8.539-41.77-.438-11.95-23.175-28.335-66.318-4.605-43.145-23.726-65.879-7.345-66.317 4.606-.438 12-2.608 24.788-8.539 41.77-5.768 16.517-8.3 21.275-29.765 20.495-14.343-.522-21.281 1.658-24.309 3.16a2.634 2.634 0 0 0-1.256 3.375c5.762 13.8 17.665 19.176 23.937 21.113-.645 9.264 3.346 20.327 16.7 26.749.4 8.769 5.073 18.133 15.959 25.814-1.79 4.722-5.912 17.443-4.29 31a34.913 34.913 0 0 1 6.05-5.9A56.784 56.784 0 0 0 69.5 226.933s-.1-5.367 1.658-8.784c0 0 4.929 22.837 35.815 38.645a8.356 8.356 0 0 1 1.952-5.466 78 78 0 0 0 22.06 10.706 78 78 0 0 0 22.06-10.706 8.356 8.356 0 0 1 1.952 5.466c30.889-15.809 35.815-38.645 35.815-38.645 1.757 3.415 1.658 8.784 1.658 8.784a56.784 56.784 0 0 0 10.343-42.063 34.9 34.9 0 0 1 6.05 5.9c1.622-13.554-2.5-26.275-4.29-31 10.883-7.678 15.554-17.041 15.959-25.814 13.354-6.422 17.344-17.485 16.7-26.749 6.269-1.937 18.174-7.315 23.937-21.113a2.632 2.632 0 0 0-1.256-3.376ZM71.155 21.197c.585-9.663 7.186-14.259 15.056-14.987 26.458-2.449 41.719 9.609 44.774 12.307 3.055-2.7 18.312-14.757 44.774-12.307 7.867.729 14.469 5.328 15.056 14.987a129.423 129.423 0 0 0 9.1 41.955s-35.905 9.072-68.929 6.494c-33.024 2.578-68.929-6.494-68.929-6.494a129.34 129.34 0 0 0 9.1-41.955ZM55.442 79.364s39.011 9.846 75.54 8.221c36.529 1.625 75.54-8.221 75.54-8.221 11.711 7.222 37.866 4.683 37.866 4.683-28.878 12.813-105.986 19.442-113.41 20.057-7.419-.615-84.528-7.244-113.4-20.057 0 0 26.155 2.536 37.866-4.683ZM195.45 105.67a23.36 23.36 0 0 0-4.3.33s-20.153-.878-48.066 13.761c0 0-7.681-2.674-12.106-2.563-4.425-.114-12.106 2.563-12.106 2.563C90.96 105.121 70.806 106 70.806 106a23.341 23.341 0 0 0-4.3-.33 26.751 26.751 0 0 1 5.127-1.523l-5.576-2.623a478.343 478.343 0 0 0 64.915 7.486 478.293 478.293 0 0 0 64.915-7.486l-5.576 2.623a26.968 26.968 0 0 1 5.127 1.523Zm-8.1 5.894c-28.473 3.073-42.6 13.908-42.6 13.908a41.409 41.409 0 0 0-13.772-1.722 41.331 41.331 0 0 0-13.764 1.727s-14.123-10.832-42.596-13.907c0 0 22.69-1.364 43.478 11.324a45.105 45.105 0 0 1 25.772 0c20.788-12.686 43.478-11.324 43.478-11.324ZM25.797 101.346c-10.667-2.641-16-7.651-18.549-11.231a1.788 1.788 0 0 1 2.036-2.719 392.232 392.232 0 0 0 20.9 6.158 18.55 18.55 0 0 0-4.387 7.792Zm12.388 4.782c.639 6.554 7.993 7.192 7.993 7.192-4.554 4.4-8.233 2.159-8.233 2.159a24.072 24.072 0 0 1 2.369 4.884 1.891 1.891 0 0 1-3.19 1.892c-4.446-4.861-8.046-13.978-2.108-22.385 4.518-6.4 10.286-5.217 13.563-2.95a4.392 4.392 0 0 1 1.115 5.774c-4.476-6.235-12.148-3.124-11.506 3.434Zm12.133 30.328c-5.418-27.376 15.758-26.2 15.758-26.2s-13.126 4.977-11.369 23.13 16.981 29.279 27.082 31.621c0 0-26.056-1.172-31.474-28.545Zm129.524 93c-1.868 1.916-4.554 2.327-6 .917a2.855 2.855 0 0 1-.411-.525l-10.008-8.383a56 56 0 0 0-7.255 9.369 32.469 32.469 0 0 1-25.184 15.026 32.479 32.479 0 0 1-25.184-15.026c-9.369-14.835-17.371-16-17.371-16a19.75 19.75 0 0 0 .063-5.136c24.156-2.971 55.567-2.282 55.567-2.282.777.237 1.553.453 2.33.657l-1.673-1.4.156-.666c.036-.147.887-3.637 3.952-4.7l.537-.186 13.434 9.339a96.788 96.788 0 0 0 10.616-.111 19.585 19.585 0 0 0 .126 4.491 11.488 11.488 0 0 0-3.376 1.343l9.759 6.785a2.82 2.82 0 0 1 .693.483c1.445 1.409 1.1 4.1-.768 6.02Zm5.31-43.712c-6.245-5.367-15.089-7.564-15.089-7.564 13.731 17.413 5.367 27.238 4.116 28.539a47.727 47.727 0 0 1-24.608-6.872c-14.418 2.467-52.922 6.9-61.416 7.861a14.546 14.546 0 0 0-.213-.833s-10.814-9.954 3.963-28.692c0 0-8.841 2.195-15.089 7.564 0 0 1.658-4.782 7.516-9.27a25.462 25.462 0 0 1-8.3-8.236c24.03 5.073 41.793-13.491 45-23 3.25-9.627 8.272-12.325 9.96-12.982 1.688.657 6.71 3.355 9.96 12.982 3.208 9.5 20.972 28.068 45 23a25.529 25.529 0 0 1-8.3 8.236c5.855 4.488 7.516 9.27 7.516 9.27Zm26.5-49.286c-5.418 27.376-31.474 28.545-31.474 28.545 10.1-2.341 25.325-13.467 27.082-31.621s-11.369-23.13-11.369-23.13 21.176-1.172 15.758 26.2Zm13.195-14.2a1.891 1.891 0 0 1-3.19-1.892 24.071 24.071 0 0 1 2.368-4.884s-3.676 2.237-8.233-2.159c0 0 7.351-.639 7.993-7.192s-7.034-9.669-11.507-3.436a4.394 4.394 0 0 1 1.115-5.774c3.277-2.27 9.045-3.448 13.563 2.95 5.939 8.41 2.342 17.527-2.108 22.387Zm29.876-32.14c-2.551 3.58-7.882 8.593-18.549 11.231a18.5 18.5 0 0 0-4.386-7.792 393.167 393.167 0 0 0 20.9-6.158 1.789 1.789 0 0 1 2.031 2.713Z"
                      stroke-dashoffset="11722.924"
                      stroke-dasharray="11722.924"
                    />
                    <path
                      d="M174.328 229.448c.741-4.317 5.034-5.945 5.079-5.963l.95-.351-.471-.327-9.759-6.785-20.92-14.543-.255.087c-2.767.965-3.544 4.149-3.574 4.284l-.075.315 18.085 15.149 10.008 8.383.773.647.156-.9Zm-1.394-1.508-8.793-7.366-17.645-14.785a5.2 5.2 0 0 1 2.56-3.133l20.069 13.95 8.509 5.915.534.372a9.236 9.236 0 0 0-4.683 5.5Z"
                      stroke-dashoffset="581.533"
                      stroke-dasharray="581.533"
                    />
                  </g>
                </svg>
              </div>
              <h1 className="text-red text-4xl font-bold uppercase sm:text-5xl md:text-6xl 2xl:text-7xl 2xl:leading-none">
                WELCOME TO THE BORED
                <span className=" text-ape-pink">APE AI </span>
                <span className="text-white"> CLUB</span>
              </h1>

              <div>
                <h3 className="text-xl">
                  A Legendary NFT collection where you enter a membership of
                  high class Ape PFPs in the swamp club for apes. The club is
                  open! Ape in with us.
                </h3>
              </div>
            </div>
            {!this.isWalletConnected() ? (
              <button
                className="bg-ape-pink text-white border-ape-pink hover:text-ape-pink hover:bg-white -mt-4 mb-10"
                disabled={this.provider === undefined}
                onClick={() => this.connectWallet()}
              >
                Connect Wallet
              </button>
            ) : null}
            <div className="py-2 my-2 border-t border-ape-pink w-full"></div>
            {!this.isWalletConnected() || this.state.isWhitelistMintEnabled ? (
              <div className="merkle-proof-manual-address text-white">
                <h2>Whitelist Proof</h2>
                <p>
                  Anyone can generate the proof using any public address in the
                  list, but <strong>only the owner of that address</strong> will
                  be able to make a successful transaction by using it.
                </p>
                {this.state.merkleProofManualAddressFeedbackMessage ? (
                  <div className="feedback-message">
                    {this.state.merkleProofManualAddressFeedbackMessage}
                  </div>
                ) : null}
                <label htmlFor="merkle-proof-manual-address !text-ape-pink">
                  Public address:
                </label>
                <input
                  id="merkle-proof-manual-address"
                  type="text"
                  placeholder="0x000..."
                  disabled={this.state.userAddress !== null}
                  value={
                    this.state.userAddress ??
                    this.state.merkleProofManualAddress
                  }
                  ref={(input) => (this.merkleProofManualAddressInput = input!)}
                  onChange={() => {
                    this.setState({
                      merkleProofManualAddress:
                        this.merkleProofManualAddressInput.value,
                    });
                  }}
                />{" "}
                <button
                  className="bg-ape-pink text-white  border-ape-pink"
                  onClick={() => this.copyMerkleProofToClipboard()}
                >
                  Generate and copy to clipboard
                </button>
              </div>
            ) : null}
          </div>
        )}
      </>
    );
  }

  private setError(error: any = null): void {
    let errorMessage = "Unknown error...";

    if (null === error || typeof error === "string") {
      errorMessage = error;
    } else if (typeof error === "object") {
      // Support any type of error from the Web3 Provider...
      if (error?.error?.message !== undefined) {
        errorMessage = error.error.message;
      } else if (error?.data?.message !== undefined) {
        errorMessage = error.data.message;
      } else if (error?.message !== undefined) {
        errorMessage = error.message;
      } else if (React.isValidElement(error)) {
        this.setState({ errorMessage: error });

        return;
      }
    }

    this.setState({
      errorMessage:
        null === errorMessage
          ? null
          : errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1),
    });
  }

  private generateContractUrl(): string {
    return this.state.networkConfig.blockExplorer.generateContractUrl(
      CollectionConfig.contractAddress!
    );
  }

  private generateMarketplaceUrl(): string {
    return CollectionConfig.marketplaceConfig.generateCollectionUrl(
      CollectionConfig.marketplaceIdentifier,
      !this.isNotMainnet()
    );
  }

  private generateTransactionUrl(transactionHash: string): string {
    return this.state.networkConfig.blockExplorer.generateTransactionUrl(
      transactionHash
    );
  }

  private async connectWallet(): Promise<void> {
    try {
      await this.provider.provider.request!({ method: "eth_requestAccounts" });

      this.initWallet();
    } catch (e) {
      this.setError(e);
    }
  }

  private async refreshContractState(): Promise<void> {
    this.setState({
      maxSupply: (await this.contract.maxSupply()).toNumber(),
      totalSupply: (await this.contract.totalSupply()).toNumber(),
      maxMintAmountPerTx: (await this.contract.maxMintAmountPerTx()).toNumber(),
      tokenPrice: await this.contract.cost(),
      isPaused: await this.contract.paused(),
      isWhitelistMintEnabled: await this.contract.whitelistMintEnabled(),
      isUserInWhitelist: Whitelist.contains(this.state.userAddress ?? ""),
    });
  }

  private async initWallet(): Promise<void> {
    const walletAccounts = await this.provider.listAccounts();

    this.setState(defaultState);

    if (walletAccounts.length === 0) {
      return;
    }

    const network = await this.provider.getNetwork();
    let networkConfig: NetworkConfigInterface;

    if (network.chainId === CollectionConfig.mainnet.chainId) {
      networkConfig = CollectionConfig.mainnet;
    } else if (network.chainId === CollectionConfig.testnet.chainId) {
      networkConfig = CollectionConfig.testnet;
    } else {
      this.setError("Unsupported network!");

      return;
    }

    this.setState({
      userAddress: walletAccounts[0],
      network,
      networkConfig,
    });

    if (
      (await this.provider.getCode(CollectionConfig.contractAddress!)) === "0x"
    ) {
      this.setError(
        "Could not find the contract, are you connected to the right chain?"
      );

      return;
    }

    this.contract = new ethers.Contract(
      CollectionConfig.contractAddress!,
      ContractAbi,
      this.provider.getSigner()
    ) as NftContractType;

    this.refreshContractState();
  }

  private registerWalletEvents(browserProvider: ExternalProvider): void {
    // @ts-ignore
    browserProvider.on("accountsChanged", () => {
      this.initWallet();
    });

    // @ts-ignore
    browserProvider.on("chainChanged", () => {
      window.location.reload();
    });
  }
}
