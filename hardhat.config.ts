import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';

dotenv.config();

// const config: HardhatUserConfig = {
//   solidity: "0.8.27",
//   defaultNetwork: "hardhat", 
//    networks: {    
//      hardhat: {},
//    }
// };

const config: HardhatUserConfig = {
	solidity: "0.8.27",
	defaultNetwork: "sepolia", 
	 networks: {    
	   hardhat: {},   
	   sepolia: {
		url: "https://rpc2.sepolia.org",
		accounts: [process.env.PRIV_KEY!]
	   },
	   arbitrumsepolia: {   
		chainId: 421614,  
		url: "https://arbitrum-sepolia.gateway.tenderly.co",      
		accounts: [process.env.PRIV_KEY!],   
	   }
	 },
	 etherscan: {
		apiKey: {
			sepolia: process.env.ETH_API_KEY!,
			arbitrumsepolia: process.env.ARBI_API_KEY!
		}
	 }
  };

export default config;
