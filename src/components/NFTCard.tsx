import {
  ThirdwebNftMedia,
  useContract,
  Web3Button,
} from "@thirdweb-dev/react";
import type { FC } from "react";
import {
  distortionsContractAddress,
  stakingContractAddress,
} from "../consts/contractAddresses";
import { useState, useEffect } from "react";
import "../styles/Home.css";

interface NFTCardProps {
  tokenId: number;
}

const NFTCard: FC<NFTCardProps> = ({ tokenId }) => {
  const { contract } = useContract(distortionsContractAddress, "nft-drop");
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    async function fetchMetadata() {
      if (!contract) return;

      const ipfsGateways = [
        "https://ipfs.io/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/",
        "https://dweb.link/ipfs/",
        "https://gateway.pinata.cloud/ipfs/",
      ];

      try {
        // Fetch token URI from the contract
        let tokenUriResult = await contract.call("tokenURI", [tokenId]);

        // Check if the result is an array and extract the value
        let tokenUri: string;
        if (Array.isArray(tokenUriResult)) {
          tokenUri = tokenUriResult[0];
        } else {
          tokenUri = tokenUriResult;
        }

        // Ensure tokenUri is a string
        if (typeof tokenUri !== "string") {
          console.error("tokenUri is not a string:", tokenUri);
          return;
        }

        // Extract CID and path from tokenUri
        const cidAndPath = tokenUri.replace("ipfs://", "");

        // Fetch metadata from multiple gateways
        let fetchedMetadata = null;
        let gatewayUsed = "";

        for (const gateway of ipfsGateways) {
          const url = gateway + cidAndPath;
          try {
            const response = await fetch(url);
            if (response.ok) {
              fetchedMetadata = await response.json();
              gatewayUsed = gateway;
              console.log(`Successfully fetched metadata from ${gateway}`);
              break;
            }
          } catch (err) {
            console.error(`Failed to fetch from ${url}:`, err);
          }
        }

        if (!fetchedMetadata) {
          throw new Error("Failed to fetch metadata from all gateways");
        }

        // Handle images that are also on IPFS
        if (fetchedMetadata.image && fetchedMetadata.image.startsWith("ipfs://")) {
          fetchedMetadata.image = fetchedMetadata.image.replace(
            "ipfs://",
            gatewayUsed
          );
        }

        // Set the metadata state
        setMetadata({
          ...fetchedMetadata,
          id: tokenId.toString(),
          uri: tokenUri,
        });
      } catch (error) {
        console.error(`Failed to fetch metadata for token ${tokenId}:`, error);
      }
    }

    fetchMetadata();
  }, [contract, tokenId]);

  return (
    <>
      {metadata && (
        <div className="nftboxS">
          <ThirdwebNftMedia metadata={metadata} className="nftmedia" />
          <h2 className="fa text br sidepadding">"{metadata.name}"</h2>
          <h4 className="fb text br sidepadding">Token {tokenId}</h4>
          <Web3Button
            action={(stakingContract) =>
              stakingContract?.call("withdraw", [[tokenId]])
            }
            contractAddress={stakingContractAddress}
            className="withdrawbutton br sidemarginbm"
          >
            <p className="fb">Withdraw</p>
          </Web3Button>
        </div>
      )}
    </>
  );
};

export default NFTCard;
