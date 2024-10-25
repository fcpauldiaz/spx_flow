import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

let lastPostTime = 0; // Last time a POST was made
const POST_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to post data with 5-minute interval
const postToNtfy = async (url, data) => {
  const currentTime = Date.now();
  if (currentTime - lastPostTime >= POST_INTERVAL) {
    try {
      const response = await fetch(url, { method: "POST", body: data });
      if (!response.ok) throw new Error(`Failed with status: ${response.status}`);
      console.log(`Posted to ${url} at ${new Date().toISOString()}`);
      lastPostTime = currentTime;
    } catch (error) {
      console.error(`Error posting to ${url}:`, error);
    }
  } else {
    console.log(`Skipping post to ${url} due to 5-minute interval requirement.`);
  }
};

app.post("/api/data", async (req, res) => {
  console.log(req.body.values);
  const { eth88_top, eth88_bottom, orderbook } = req.body.values;
  // Check and post based on conditions
  if (eth88_top >= 5 && eth88_top < 6) {
    await postToNtfy("https://ntfy.sh/emini_options88", eth88_top);
  }

  if (eth88_bottom <= -5 && eth88_bottom > -6) {
    await postToNtfy("https://ntfy.sh/emini_options88", eth88_bottom);
  }

  if ((orderbook >= 5 && orderbook < 6) || (orderbook <= -5 && orderbook > -6)) {
    await postToNtfy("https://ntfy.sh/emini_orderbook", orderbook);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});