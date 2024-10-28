import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const lastPostTimes = {
  emini_options88_top: 0,
  emini_options88_bottom: 0,
  emini_orderbook: 0,
  emini_flow: 0,
  emini_short_setup: 0,
  emini_long_setup: 0,
};
const POST_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

const gexFlowData = {
  value: null,
  timestamp: 0
};
const GEX_FLOW_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Add Discord webhook URL constant (you should replace this with your actual webhook URL)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "YOUR_DISCORD_WEBHOOK_URL";

// Add function to post to Discord
const postToDiscord = async (message) => {
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Discord webhook failed with status: ${response.status}`);
    }
    console.log('Successfully posted to Discord');
  } catch (error) {
    console.error('Error posting to Discord:', error);
  }
};

// Function to post data with 5-minute interval
const postToNtfy = async (url, conditionKey, data) => {
  const currentTime = Date.now();
  if (currentTime - lastPostTimes[conditionKey] >= POST_INTERVAL) {
    try {
      const response = await fetch(url, { method: "POST", body: data });
      if (!response.ok) throw new Error(`Failed with status: ${response.status}`);
      console.log(`Posted to ${url} for ${conditionKey} at ${new Date().toISOString()}`);
      lastPostTimes[conditionKey] = currentTime; // Update last post time for this condition

      // Also post to Discord
     await postToDiscord(`${conditionKey}: ${data}`);
    } catch (error) {
      console.error(`Error posting to ${url} for ${conditionKey}:`, error);
    }
  } else {
    console.log(`Skipping post to ${url} for ${conditionKey} due to interval constraint.`);
  }
};

app.post("/api/data", async (req, res) => {
  console.log(req.body.values);
  const { eth88_top, eth88_bottom, orderbook, flow_middle, flow_bottom, gex_flow } = req.body.values;
  
  // Update gex_flow if present
  if (gex_flow !== null) {
    gexFlowData.value = gex_flow;
    gexFlowData.timestamp = Date.now();
  }

  // Get the current gex_flow value (within 5 minute window)
  const currentTime = Date.now();
  const savedGexFlow = currentTime - gexFlowData.timestamp <= GEX_FLOW_TIMEOUT ? gexFlowData.value : null;
  console.log("savedGexFlow -> ", savedGexFlow, "difference flow -> ", Math.abs(flow_middle - flow_bottom));

  // if all values are exactly 0, don't post anything
  if (eth88_top === null && eth88_bottom === null && orderbook === 0 && flow_middle === 0 && flow_bottom === 0) {
    return res.sendStatus(200);
  }

  // Check and post based on conditions
  if (eth88_top >= 5 && eth88_top < 6) {
    await postToNtfy("https://ntfy.sh/emini_options88", "emini_options88_top", `Options88: ${eth88_top}`);
  }

  if (eth88_bottom <= -5 && eth88_bottom > -6) {
    await postToNtfy("https://ntfy.sh/emini_options88", "emini_options88_bottom", `Options88: ${eth88_bottom}`);
  }

  if ((orderbook >= 5 && orderbook < 6) || (orderbook <= -5 && orderbook > -6)) {
    await postToNtfy("https://ntfy.sh/emini_orderbook", "emini_orderbook", orderbook > 0 ? `Orderbook: ${orderbook}` : `Orderbook: ${orderbook}`);
  }

  // if flow middle is near 0, by 0.02
  if (flow_middle >= -0.02 && flow_middle <= 0.02) {
    await postToNtfy("https://ntfy.sh/emini_flow", "emini_flow", `Flow Near Zero: ${flow_middle}`);
  }

  if (flow_middle >= -0.02 && flow_middle <= 0.02 && savedGexFlow != null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", `Short Setup formed`);
  }

  // flow middle and flow bottom are near each other
  if (Math.abs(flow_middle - flow_bottom) <= 0.02 && savedGexFlow != null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", `Long Setup formed`);
  }

  res.sendStatus(200);
});

app.get("/health", (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});