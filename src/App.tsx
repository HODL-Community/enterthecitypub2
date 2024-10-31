import { 
  ConnectWallet, 
  Web3Button,
  useContract,
  useContractRead,
  useAddress,
  useTokenBalance,
  ThirdwebNftMedia,
  darkTheme
} from "@thirdweb-dev/react";
import NFTCard from "./components/NFTCard";
import "./styles/Home.css";
import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";

export default function Home() {

  const address = useAddress();
  // define contract addresses
  const distortionsContractAddress = "0x0A337Be2EA71E3aeA9C82D45b036aC6a6123B6D0";
  const revelationsContractAddress = "0xE0BfABfF6D91f23a48B5959DACf780006aBED187";
  const auraContractAddress = "0xa346D51362E2cF7c09cf38Ccf5E2b208B071e71b"; 
  const stakingContractAddress = "0x51697170F78136c8d143B0013Cf5B229aDe70757";

  // define the NFT balance item type
  interface NftBalance {
    tokenId: string;
    metadata: {
      id: string;
      uri: string;
      name?: string;
      description?: string;
      image?: string;
      [key: string]: any;
    };
    tokenUri: string;
  }

  // initialize contracts for interaction
  const { contract: distortionsContract } = useContract(
      distortionsContractAddress,
    "nft-drop"
  );
  const { contract: revelationsContract } = useContract(
      revelationsContractAddress,
    "nft-drop"
  );
  const { contract: auraContract } = useContract(
      auraContractAddress,
    "token"
  );
  const { contract: stakingContract } = useContract(
    stakingContractAddress,
  );

  // define fetch functions
  const { data: stakedTokens } = useContractRead(stakingContract, "getStakeInfo", [
    address,
  ]);

  const [ownedDistortions, setOwnedDistortions] = useState<NftBalance[]>([]);

  useEffect(() => {
    async function fetchOwnedNFTs() {
      if (address) {
        try {
          const response = await fetch(
            `https://glacier-api.avax.network/v1/chains/43114/addresses/${address}/balances:listErc721?pageSize=10&contractAddress=${distortionsContractAddress}`
          );
          const data = await response.json();
  
          if (data && data.erc721TokenBalances) {
            const tokenBalances: NftBalance[] = await Promise.all(
              data.erc721TokenBalances.map(async (item: any) => {
                const tokenId = item.tokenId;
  
                // Convert ipfs:// to https://
                let tokenUri = item.tokenUri;
                if (tokenUri.startsWith('ipfs://')) {
                  tokenUri = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
  
                // Fetch metadata from tokenUri
                let metadata: any = {};
                try {
                  const metadataResponse = await fetch(tokenUri);
                  metadata = (await metadataResponse.json()) as any;
                
                  // Handle images that are also on IPFS
                  if (metadata.image && metadata.image.startsWith('ipfs://')) {
                    metadata.image = metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
                  }
                } catch (err) {
                  console.error(`Failed to fetch metadata for token ${tokenId}:`, err);
                }

  
                return {
                  tokenId,
                  metadata: {
                    ...metadata,
                    id: tokenId,
                    uri: tokenUri,
                  },
                  tokenUri: item.tokenUri,
                };
              })
            );
            setOwnedDistortions(tokenBalances);
          } else {
            setOwnedDistortions([]);
          }
        } catch (error) {
          console.error('Failed to fetch owned NFTs:', error);
          setOwnedDistortions([]);
        }
      }
    }
    fetchOwnedNFTs();
  }, [address, distortionsContractAddress]);
  
  const { data: auraBalance } = useTokenBalance(auraContract, address);
  //rewards updates
  const [claimableRewards, setClaimableRewards] = useState<BigNumber>();
  useEffect(() => {
    if (!stakingContract || !address) return;

    async function loadClaimableRewards() {
      const stakeInfo = await stakingContract?.call("getStakeInfo", [address]);
      setClaimableRewards(stakeInfo[1]);
    }

    loadClaimableRewards();
  }, [address, stakingContract]);

  // stake functions
  async function stake(id: string) {
    if (!address) return;

    const isApproved = await distortionsContract?.isApproved(
      address,
      stakingContractAddress
    );
    if (!isApproved) {
      await distortionsContract?.setApprovalForAll(stakingContractAddress, true);
    }
    await stakingContract?.call("stake", [[id]]);
  }

  return (
    <main className="main bg1">
      <div className="colbox">
        <h1 className="fa head"
        >Enter The City</h1>
      </div>
      <div className="colbox">
      <div className="colbox bg2">
      <h1 className="fa">Stake</h1>

        <div className="rowboxGAP widthboost">
          <div className="colbox">
          <h3 className="fb">
            <b className="text">
              {!claimableRewards
                ? "Loading..."
                : ethers.utils.formatUnits(claimableRewards, 18)}
            </b>
            <br></br>
            Aura Pending</h3>
            <div>
      {address ? (
        <Web3Button
          className="ccbutton"
          action={(contract) => contract.call("claimRewards")}
          contractAddress={stakingContractAddress}
        >
          <p className="fb">Claim Rewards</p>
        </Web3Button>
      ) : (
        <ConnectWallet 
        className="ccbutton" 
        style={
          { 
            fontFamily: 'Doctor Glitch',
            fontWeight: 'normal',
            fontStyle: 'oblique',
            color: 'white'
          }
        } 
        theme={darkTheme({ fontFamily: "Hacked, sans-serif", colors: { modalBg: "#002020", accentText: "cyan" } })}
        />
      )}
    </div>
          </div>
        </div>
        <div className="rowboxGAP">
        <div  className="rmar">
          <div className="colbox">
        <h2 className="fa">Your Distortions</h2>
        <div className="rowbox">
          {ownedDistortions?.map((nft) => (
            <div key={nft.tokenId}
            className="nftbox"
            >
              <ThirdwebNftMedia
                metadata={nft.metadata}
                className="nftmedia"
              />
              <h2 className="fa text br sidepadding">"{nft.metadata.name}"</h2>
              <h4 className="fb text br sidepadding">Token {nft.tokenId}</h4>
              <Web3Button
                contractAddress={stakingContractAddress}
                action={() => stake(nft.tokenId)}
                className="stakebutton br sidemarginbm"
              >
                <p className="fb">Stake for Aura</p>
              </Web3Button>
            </div>
          ))}
        </div>

        <h3 className="fa">Staked:</h3>
        <div>
            {stakedTokens &&
              stakedTokens[0]?.map((stakedToken: BigNumber) => (
                <NFTCard
                  tokenId={stakedToken.toNumber()}
                  key={stakedToken.toString()}
                />
              ))}
          </div>
        </div>
        <div className="rowbox">
          
        </div>
        </div>
        </div>
        </div>
      <div className="colbox bg3">
        <div className="rowbox widthboost">
        <p className="text">
          <b>{auraBalance?.displayValue}</b><b className="fb">$AURA</b>
        </p>

        <button className="buta">
        <h1 className="fa">Explore The City</h1>
        <br></br>
        <h3 className="fb">Coming Soon...</h3>
        </button>
        <p className="text">
          <b></b><b className="fb">$AVAX</b>
        </p>
        </div>
        <h2 className="fb">Gluttony's Indulgence<br></br>500 $AURA<br></br>0.015 $AVAX</h2>
      </div>
      </div>
    </main>
  );
}
