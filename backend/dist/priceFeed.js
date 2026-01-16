export async function getCroPriceInUsdc() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=crypto-com-chain&vs_currencies=usd,usdc&include_24hr_change=true&include_market_cap=true');
        if (!response.ok)
            throw new Error('Network response was not ok');
        const data = await response.json();
        const coin = data && data['crypto-com-chain'];
        if (!coin) {
            console.error('Unexpected response shape from Coingecko:', data);
            return undefined;
        }
        // prefer `usd`, fall back to `usdc`, then any numeric value
        const price = (typeof coin.usd === 'number' && coin.usd) || (typeof coin.usdc === 'number' && coin.usdc) || Object.values(coin).find(v => typeof v === 'number');
        if (typeof price !== 'number') {
            console.error('Price not found in response:', coin);
            return undefined;
        }
        console.log('Fetched CRO price data:', coin);
        console.log(`CRO Price: $${price.toFixed(4)} USD`);
        return price;
    }
    catch (error) {
        console.error('Error fetching CRO price:', error);
    }
}
