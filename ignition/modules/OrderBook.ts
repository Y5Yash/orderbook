import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OrderBookModule = buildModule("OrderbookModule", (m) => {
	const initPrice = m.getParameter("_initPrice", 1000);
	const orderBook = m.contract("OrderBook", [initPrice]);
	return {orderBook};
})

module.exports = OrderBookModule;