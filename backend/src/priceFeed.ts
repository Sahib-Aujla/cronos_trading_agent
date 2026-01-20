let cachedPrice: number | null = null;
let lastFetch = 0;


export async function getCroPriceInUsdc() {
    const now = Date.now();

    if (cachedPrice && now - lastFetch < 30_000) {
        return cachedPrice; // 30s cache
    }
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price" +
            "?ids=crypto-com-chain" +
            "&vs_currencies=usd,usdc" +
            "&include_24hr_change=true" +
            "&include_market_cap=true",
            {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "cronos-trading-bot/1.0 (contact: sahibpreetsingh229@gmail.com)",
                },
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error("CoinGecko error:", response.status, text);
            throw new Error(`CoinGecko HTTP ${response.status}`);
        }

        const data = await response.json();
        const coin = data?.["crypto-com-chain"];

        if (!coin) {
            console.error("Unexpected response shape:", data);
            return undefined;
        }

        const price = (
            (typeof coin.usd === "number" && coin.usd) ||
            (typeof coin.usdc === "number" && coin.usdc)
        );

        cachedPrice = price;
        lastFetch = now;

        return price;

    } catch (error) {
        console.error("Error fetching CRO price:", error);
        return undefined;
    }
}
