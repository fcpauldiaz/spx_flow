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
const FLOW_LEVEL_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

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

// Replace the individual data objects with a single flowData structure
const flowData = {
  flow_up_level: { value: null, timestamp: 0 },
  flow_dn_level: { value: null, timestamp: 0 },
  flow_weak_up_level: { value: null, timestamp: 0 },
  flow_weak_dn_level: { value: null, timestamp: 0 },
  gex_level: { value: null, timestamp: 0 },
  sentiment: { value: null, timestamp: 0 }
};



// Helper function to update flow data
const updateFlowData = (key, value) => {
  if (value !== null) {
    flowData[key].value = value;
    flowData[key].timestamp = Date.now();
    console.log(`Updated ${key} ->`, value, "at", new Date().toISOString());
  }
};

// Helper function to get current flow value
const getCurrentFlow = (key, timeout = FLOW_TIMEOUT) => {
  const currentTime = Date.now();
  return currentTime - flowData[key].timestamp <= timeout ? flowData[key].value : null;
};

app.post("/api/data", async (req, res) => {
  console.log(req.body?.values);
  console.log("Current time:", new Date().toISOString());
  
  const values = req.body?.values || {};
  const {
    eth88_top = null,
    eth88_bottom = null,
    orderbook = null,
    flow_middle = null,
    flow_bottom = null,
    flow_up_level = null,
    flow_dn_level = null,
    flow_weak_up_level = null,
    flow_weak_dn_level = null,
    gex_level = null,
    current_es = null
  } = values;

  if (!req.body?.values) {
    console.error("Missing values object in request body");
    return res.status(400).json({ error: "Missing values object in request body" });
  }

  // Update sentiment at 4 AM
  const currentHour = new Date().getHours();
  if (currentHour === 4 && flow_middle !== null) {
    updateFlowData('sentiment', flow_middle > 0 ? "bullish" : "bearish");
  }

  // Update flow levels
  updateFlowData('flow_up_level', flow_up_level);
  updateFlowData('flow_dn_level', flow_dn_level);
  updateFlowData('flow_weak_up_level', flow_weak_up_level);
  updateFlowData('flow_weak_dn_level', flow_weak_dn_level);
  updateFlowData('gex_level', gex_level);

  const savedFlowUpLevel = getCurrentFlow('flow_up_level');
  const savedFlowDnLevel = getCurrentFlow('flow_dn_level');
  const savedFlowWeakUpLevel = getCurrentFlow('flow_weak_up_level');
  const savedFlowWeakDnLevel = getCurrentFlow('flow_weak_dn_level');
  const savedGexLevel = getCurrentFlow('gex_level');
  const currentSentiment = getCurrentFlow('sentiment', SENTIMENT_TIMEOUT);

  console.log("Current flow levels:", {
    up: savedFlowUpLevel,
    down: savedFlowDnLevel,
    weakUp: savedFlowWeakUpLevel,
    weakDown: savedFlowWeakDnLevel,
    gex: savedGexLevel,
    sentiment: currentSentiment,
    current_time: new Date().toISOString()
  });

  // Rest of your existing code, but use the new helper functions
  const flow_near_zero = flow_middle !== null && flow_middle >= -0.02 && flow_middle <= 0.02;
  const flow_blue_red_intersection = flow_middle !== null && flow_bottom !== null && 
    Math.abs(flow_middle - flow_bottom) <= 0.01;
  const flow_setup = flow_near_zero || flow_blue_red_intersection;

  // Update your notification conditions to use the new structure
  if (flow_setup && savedFlowUpLevel !== null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", 
      `Flow + Option Level: ${savedFlowUpLevel} + Sentiment Flow: ${currentSentiment}`);
  }

  if (flow_setup && savedFlowDnLevel !== null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", 
      `Flow + Option Level: ${savedFlowDnLevel} + Sentiment Flow: ${currentSentiment}`);
  }

  if (flow_near_zero && savedFlowWeakUpLevel !== null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_short_setup", 
      `Flow + Option Level: ${savedFlowWeakUpLevel} + Sentiment Flow: ${currentSentiment}`);
  }

  if (flow_near_zero && savedFlowWeakDnLevel !== null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_weak_long_setup", 
      `Flow + Option Level: ${savedFlowWeakDnLevel} + Sentiment Flow: ${currentSentiment}`);
  }

  // if (flow_middle !== null && flow_bottom !== null && Math.abs(flow_middle - flow_bottom) <= 0.01) {
  //   await postToNtfy("https://ntfy.sh/emini_blue_red_intersection", "emini_blue_red_intersection", Math.abs(flow_middle - flow_bottom));
  // }

  if (flow_setup && savedFlowUpLevel !== null) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_setup", 
      `Flow + Option Level: ${savedFlowUpLevel} + Sentiment Flow: ${currentSentiment}`);
  }

  if (savedGexLevel !== null && orderbook !== null && orderbook <= -4.8 && orderbook > -6) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_long_setup", `Order book + Gex Ladder Level: ${savedGexLevel} + Sentiment Flow: ${sentimentData.value}`);
  }

  if (savedGexLevel !== null && orderbook !== null && orderbook >= 4.8 && orderbook < 6) {
    await postToNtfy("https://ntfy.sh/emini_setup", "emini_short_setup", `Order book + Gex Ladder Level: ${savedGexLevel} + Sentiment Flow: ${sentimentData.value}`);
  }

  if ((savedFlowUpLevel != null || savedFlowDnLevel != null) && savedGexLevel !== null && flow_setup) {
    await postToNtfy("https://ntfy.sh/emini_setup_strong", "emini_setup_strong", `Flow Setup + Flow Level: ${savedFlowUpLevel || savedFlowDnLevel} + Gex Ladder Level: ${savedGexLevel}`);
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