// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// used _update instead of transferFrom to override approvals/allowances conditions

contract OrderBook is ERC20 
{
	struct Trade
	{
		uint tradeId;
		address trader;
		uint amount;
		uint leverage;
		bytes32 market; // unused
		bool positionSide; // false if long, true if short (alternatively name: isShort)
		uint openPrice;
		uint closePrice;
		bool isOpen;
	}

	mapping (address => mapping(uint => Trade)) public tradeList;
	uint public currentPrice;
	address owner;
	uint public tradeCounter;

	event OwnerBankrupt(address indexed userDefaultedTo, uint defaultAmount);
	event UserBankrupt(address indexed userDefaulted, uint defaultAmount);
	event TradeAdded(address indexed user, uint indexed tradeId);
	event TradeClosed(address indexed user, uint indexed tradeId);

	constructor(uint _initPrice) ERC20("USDC", "USDC")
	{
		_mint(msg.sender, 1000000 * (10 ** decimals())); // only mint initially, no overflow.
		owner = msg.sender;
		currentPrice = _initPrice;
		tradeCounter = 0;
	}

	function addTrade(
		uint _amount, 
		uint _leverage, 
		bytes32 _market, 
		bool _positionSide
		) public
		{
			if (!_positionSide) // if long
			{
				require(_amount * currentPrice <= balanceOf(msg.sender), "Not enough balance to long");
				_update(msg.sender, owner, _amount);
			}
			// else { // some short logic} <- assume no initial deposit when shorted
			// did not award user _amount if shorted as no collateral exists.
			tradeCounter++;

			tradeList[msg.sender][tradeCounter].tradeId = tradeCounter;
			tradeList[msg.sender][tradeCounter].trader = msg.sender;
			tradeList[msg.sender][tradeCounter].amount = _amount;
			tradeList[msg.sender][tradeCounter].leverage = _leverage;
			tradeList[msg.sender][tradeCounter].market = _market;
			tradeList[msg.sender][tradeCounter].positionSide = _positionSide;
			tradeList[msg.sender][tradeCounter].openPrice = currentPrice;
			tradeList[msg.sender][tradeCounter].isOpen = true;
			emit TradeAdded(msg.sender, tradeCounter);
		}

	function closeTrade(uint _tradeId) public
	{
		require(tradeList[msg.sender][_tradeId].isOpen, "Trade already closed or does not exist");
		tradeList[msg.sender][_tradeId].isOpen = false;
		(bool isProfit, uint change) = calculatePnL(_tradeId); // checks performed in calculatePnL
		uint totamount;
		if (!tradeList[msg.sender][_tradeId].positionSide) 
		{
			totamount = tradeList[msg.sender][_tradeId].amount * tradeList[msg.sender][_tradeId].openPrice; // longed amount that had been deposited needs to be returned too.
		}
		uint toReturn;										// remains 0 if net return is negative.
		if (isProfit) toReturn = totamount + change;
		else if (totamount > change) toReturn = totamount - change;
		if (toReturn != 0)
		{
			if (balanceOf(owner) >= toReturn)
			{
				_update(owner, msg.sender, toReturn);
			}
			else
			{
				uint ownerBal = balanceOf(owner);
				_update(owner, msg.sender, ownerBal);
				emit OwnerBankrupt(msg.sender, toReturn - ownerBal);
			}
		}
		else
		{
			if (balanceOf(msg.sender) >= change - totamount)
			{
				_update(msg.sender, owner, change - totamount);
			}
			else
			{
				uint senderBal = balanceOf(msg.sender);
				_update(msg.sender, owner, senderBal);
				emit UserBankrupt(msg.sender, change - totamount - senderBal);
			}
		}
		tradeList[msg.sender][_tradeId].closePrice = currentPrice;
		emit TradeClosed(msg.sender, tradeCounter);
	}

	// users can keep track of PnL using this view function
	function calculatePnL(uint _tradeId) public view returns (bool, uint) 
	{
		require(tradeList[msg.sender][_tradeId].tradeId == _tradeId, "TradeId is not yours or doesn't exist");
		bool isProfit;
		if (currentPrice > tradeList[msg.sender][_tradeId].openPrice)
		{
			isProfit = !tradeList[msg.sender][_tradeId].positionSide; // long => profit
			return (isProfit, calculateGreater(_tradeId));
		}
		else
		{
			isProfit = tradeList[msg.sender][_tradeId].positionSide; // short => profit
			return (isProfit, calculateLesser(_tradeId));
		}
	}

	// only callable by calculatePnL, which ensures currentPrice > openPrice
	function calculateGreater(uint _tradeId) internal view returns (uint)
	{
		uint difference = currentPrice - tradeList[msg.sender][_tradeId].openPrice;
		uint leverage = tradeList[msg.sender][_tradeId].leverage;
		uint amount = tradeList[msg.sender][_tradeId].amount;
		return difference * leverage * amount;
	}

	// only callable by calculatePnL, which ensures currentPrice <= openPrice
	function calculateLesser(uint _tradeId) internal view returns (uint)
	{
		uint difference = tradeList[msg.sender][_tradeId].openPrice - currentPrice;
		uint leverage = tradeList[msg.sender][_tradeId].leverage;
		uint amount = tradeList[msg.sender][_tradeId].amount;
		return difference * leverage * amount;
	}

	function dummyPriceChange(uint _newPrice) public
	{
		// require(msg.sender == owner, "Only Owner can change the price");
		// **uncomment above line to only allow the owner to change price**
		currentPrice = _newPrice;
	}
}