import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const lastPostTimes = {
  emini_options88_top: 0,
  emini_options88_bottom: 0,
  emini_orderbook: 0,
  emini_flow: 0,
  emini_short_setup: 0,
  emini_long_setup: 0,
  emini_blue_red_intersection: 0,
};

const sentimentData = {
  value: null,
  timestamp: 0
};
const SENTIMENT_TIMEOUT = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
const FLOW_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const POST_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Add Discord webhook URL constant (you should replace this with your actual webhook URL)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL  || "YOUR_DISCORD_WEBHOOK_URL";
// Get sentiment directly from env var
let SENTIMENT = process.env.INITIAL_SENTIMENT || null;
console.log(`Using sentiment from environment: ${SENTIMENT}`);

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
  console.log(req.body?.values, SENTIMENT);
  console.log("Current time:", new Date().toISOString());
  
  const values = req.body?.values || {};
  const {
    flow_resistance_1 = null,
    flow_resistance_2 = null,
    flow_support_1 = null,
    flow_support_2 = null,
    orderbook = null,
    flow_middle = null,
    flow_avg = null,
    flow_bottom = null,
    eth88_top = null,
    eth88_bottom = null,
    current_es = null
  } = values;

  if (!req.body?.values) {
    console.log(req.body);
    console.error("Missing values object in request body");
    return res.status(400).json({ error: "Missing values object in request body" });
  }

   // Update sentiment at 4 AM
  const currentHour = new Date().getHours();
  if (currentHour === 8 && flow_middle !== null) {
    //updateFlowData('sentiment', flow_middle > 0 ? "bullish" : "bearish");
    SENTIMENT = flow_middle > 0 ? "bullish" : "bearish";
  }

  const currentSentiment = SENTIMENT;

  // post to discord if flow middle is near current es
  if (flow_avg !== null && Math.abs(flow_avg - current_es) <= 2) {
    await postToNtfy("https://ntfy.sh/emini_setup", "avg_flow", `ES approaching avg flow: ${flow_avg}`);
  }

  // Rest of your existing code, but use the new helper functions
  // const flow_near_zero = flow_middle !== null && flow_middle >= -0.02 && flow_middle <= 0.02;
  // const flow_blue_red_intersection = flow_middle !== null && flow_bottom !== null && 
  //   Math.abs(flow_middle - flow_bottom) <= 0.02;
  // const flow_setup = flow_near_zero || flow_blue_red_intersection;

  // const es_near_flow_resistance_1 = current_es !== null && flow_resistance_1 !== null && 
  //   Math.abs(current_es - flow_resistance_1) <= 1;
  
  // const es_near_flow_support_1 = current_es !== null && flow_support_1 !== null && 
  //   Math.abs(current_es - flow_support_1) <= 1;

  // const es_near_flow_resistance_2 = current_es !== null && flow_resistance_2 !== null && 
  //   Math.abs(current_es - flow_resistance_2) <= 1;

  // const es_near_flow_support_2 = current_es !== null && flow_support_2 !== null && 
  //   Math.abs(current_es - flow_support_2) <= 1;

  // Flow + Option Level
  // if (flow_setup && es_near_flow_resistance_2) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", 
  //     `Flow + Option Level: ${flow_resistance_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  // if (flow_setup && es_near_flow_support_2) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", 
  //     `Flow + Option Level: ${flow_support_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  // // Option Flow + Weak Option Level
  // if (flow_near_zero && es_near_flow_resistance_1) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_short_setup", 
  //     `Flow + Option Level: ${flow_resistance_1} + Sentiment Flow: ${currentSentiment}`);
  // }

  // if (flow_near_zero && es_near_flow_support_1) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_long_setup", 
  //     `Flow + Option Level: ${flow_support_1} + Sentiment Flow: ${currentSentiment}`);
  // }

  // // Order book + WeakOption Level
  // if (orderbook !== null && es_near_flow_support_1 && orderbook <= -4.8 && orderbook > -6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_long_setup",
  //     `Order book + Option Level: ${flow_support_1} + Sentiment Flow: ${currentSentiment}`);
  // }

  //  if (orderbook !== null && es_near_flow_resistance_1 && orderbook >= 4.8 && orderbook < 6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_short_setup",
  //     `Order book + Option Level: ${flow_resistance_1} + Sentiment Flow: ${currentSentiment}`);
  // }

  //  // Order book + Flow Level
  // if (orderbook !== null && es_near_flow_support_2 && orderbook <= -4.8 && orderbook > -6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_long_setup",
  //     `Order book + Option Level: ${flow_support_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  //  if (orderbook !== null && es_near_flow_resistance_2 && orderbook >= 4.8 && orderbook < 6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_short_setup",
  //     `Order book + Option Level: ${flow_resistance_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  // // if (flow_middle !== null && flow_bottom !== null && Math.abs(flow_middle - flow_bottom) <= 0.01) {
  // //   await postToNtfy("https://ntfy.sh/emini_blue_red_intersection", "emini_blue_red_intersection", Math.abs(flow_middle - flow_bottom));
  // // }

  // if (flow_blue_red_intersection && (es_near_flow_support_1 || es_near_flow_support_2)) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_setup", 
  //     `Flow + Option Level: ${flow_support_1 || flow_support_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  // // ETH88 between -4.8 and -6 and weak option level
  // if (eth88_bottom !== null && eth88_bottom >= -4.8 && eth88_bottom < -6 && (es_near_flow_support_1 || es_near_flow_support_2)) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", 
  //     `ETH88 + ${eth88_bottom} + Option Level: ${es_near_flow_support_1 ? flow_support_1 : flow_support_2} + Sentiment Flow: ${currentSentiment}`);
  // }
  
  // // ETH88 between 4.8 and 6 and weak option level
  // if (eth88_top !== null && eth88_top >= 4.8 && eth88_top < 6 && (es_near_flow_resistance_1 || es_near_flow_resistance_2)) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", 
  //     `ETH88 + ${eth88_top} + Option Level: ${es_near_flow_resistance_1 ? flow_resistance_1 : flow_resistance_2} + Sentiment Flow: ${currentSentiment}`);
  // }

  // Order book + Gex Ladder Level
  // if (savedGexLevel !== null && orderbook !== null && orderbook <= -4.8 && orderbook > -6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", `Order book + Gex Ladder Level: ${savedGexLevel} + Sentiment Flow: ${sentimentData.value}`);
  // }

  // if (savedGexLevel !== null && orderbook !== null && orderbook >= 4.8 && orderbook < 6) {
  //   await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", `Order book + Gex Ladder Level: ${savedGexLevel} + Sentiment Flow: ${sentimentData.value}`);
  // }

  // if ((savedFlowUpLevel != null || savedFlowDnLevel != null) && savedGexLevel !== null && flow_setup) {
  //   await postToNtfy("https://ntfy.sh/emini_setup_strong", "emini_setup_strong", `Flow Setup + Flow Level: ${savedFlowUpLevel || savedFlowDnLevel} + Gex Ladder Level: ${savedGexLevel}`);
  // }

  res.sendStatus(200);
});

app.get("/health", (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});