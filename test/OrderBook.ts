import {
	loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
  
  describe("OrderBook", function () {
	async function deployOrderBookFixture() {
	  const initialPrice = 1000;
  
	  const [owner, user1] = await hre.ethers.getSigners();
  
	  const OrderBook = await hre.ethers.getContractFactory("OrderBook");
	  const orderBook = await OrderBook.deploy(initialPrice);
  
	  return { orderBook, initialPrice, owner, user1 };
	}
  
	describe("Deployment", function () {
	  it("Should set the correct initial price", async function () {
		const { orderBook, initialPrice } = await loadFixture(deployOrderBookFixture);
		expect(await orderBook.currentPrice()).to.equal(initialPrice);
	  });
  
	  it("Should mint initial tokens to the owner", async function () {
		const { orderBook, owner } = await loadFixture(deployOrderBookFixture);
		expect(await orderBook.balanceOf(owner.address)).to.equal(1000000n ** 4n); 
	  });
	});
  
	describe("Adding Trades", function () {
	  it("Should allow a user to add a trade", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USDC"), false);
  
		const trade = await orderBook.tradeList(user1.address, 1);
		expect(trade.amount).to.equal(100);
		expect(trade.leverage).to.equal(2);
		expect(trade.isOpen).to.equal(true);
	  });
  
	  it("Should emit TradeAdded event when a trade is added", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await expect(orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USD"), false))
		  .to.emit(orderBook, "TradeAdded")
		  .withArgs(user1.address, 1); // Assumes it's the first trade
	  });
  
	  it("Should revert if user tries to add a trade without enough balance", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 99999));
		await expect(orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USD"), false))
		  .to.be.revertedWith("Not enough balance to long");
	  });
	});
  
	describe("Closing Trades", function () {
  
	  it("Should allow a user to close a trade", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USDC"), false);
		await orderBook.connect(user1).closeTrade(1);
  
		const trade = await orderBook.tradeList(user1.address, 1);
		expect(trade.isOpen).to.equal(false);
	  });
  
	  it("Should emit TradeClosed event when a trade is closed", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USDC"), false);
		await expect(orderBook.connect(user1).closeTrade(1))
		  .to.emit(orderBook, "TradeClosed")
		  .withArgs(user1.address, 1);
	  });
  
	  it("Should revert if trying to close an already closed trade", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await orderBook.connect(user1).addTrade(100, 2, hre.ethers.encodeBytes32String("BTC/USDC"), false);
		await orderBook.connect(user1).closeTrade(1);
		await expect(orderBook.connect(user1).closeTrade(1))
		  .to.be.revertedWith("Trade already closed or does not exist");
	  });
	});
  
	describe("Price Changes", function () {
	  it("Should allow price changes", async function () {
		const { orderBook, owner } = await loadFixture(deployOrderBookFixture);
		await orderBook.connect(owner).dummyPriceChange(1200);
		expect(await orderBook.currentPrice()).to.equal(1200);
	  });
	});

	describe("PnL Computation", function () {
	  it("Verify PnL computation", async function () {
		const { orderBook, owner, user1 } = await loadFixture(deployOrderBookFixture);
		await(orderBook.connect(owner).transfer(user1, 100000));
		await orderBook.connect(user1).addTrade(100, 5, hre.ethers.encodeBytes32String("BTC/USDC"), false);
		await orderBook.connect(owner).dummyPriceChange(1200);
		const [isProfit1, change1] = await orderBook.connect(user1).calculatePnL(1);
		expect(isProfit1).to.equal(true);
		expect(change1).to.equal(100000);
		await orderBook.connect(owner).dummyPriceChange(750);
		const [isProfit2, change2] = await orderBook.connect(user1).calculatePnL(1);
		expect(isProfit2).to.equal(false);
		expect(change2).to.equal(125000);
	});
	})
  });
  