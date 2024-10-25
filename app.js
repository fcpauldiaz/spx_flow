import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const lastPostTimes = {
  emini_options88_top: 0,
  emini_options88_bottom: 0,
  emini_orderbook: 0,
};
const POST_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to post data with 5-minute interval
const postToNtfy = async (url, conditionKey, data) => {
  const currentTime = Date.now();
  if (currentTime - lastPostTimes[conditionKey] >= POST_INTERVAL) {
    try {
      const response = await fetch(url, { method: "POST", body: data });
      if (!response.ok) throw new Error(`Failed with status: ${response.status}`);
      console.log(`Posted to ${url} for ${conditionKey} at ${new Date().toISOString()}`);
      lastPostTimes[conditionKey] = currentTime; // Update last post time for this condition
    } catch (error) {
      console.error(`Error posting to ${url} for ${conditionKey}:`, error);
    }
  } else {
    console.log(`Skipping post to ${url} for ${conditionKey} due to interval constraint.`);
  }
};

app.post("/api/data", async (req, res) => {
  console.log(req.body.values);
  const { eth88_top, eth88_bottom, orderbook } = req.body.values;
  // Check and post based on conditions
  if (eth88_top >= 5 && eth88_top < 6) {
    await postToNtfy("https://ntfy.sh/emini_options88", "emini_options88_top", `Resistance: ${eth88_top}`);
  }

  if (eth88_bottom <= -5 && eth88_bottom > -6) {
    await postToNtfy("https://ntfy.sh/emini_options88", "emini_options88_bottom", `Support: ${eth88_bottom}`);
  }

  if ((orderbook >= 5 && orderbook < 6) || (orderbook <= -5 && orderbook > -6)) {
    await postToNtfy("https://ntfy.sh/emini_orderbook", "emini_orderbook", orderbook > 0 ? `Resistance: ${orderbook}` : `Support: ${orderbook}`);
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