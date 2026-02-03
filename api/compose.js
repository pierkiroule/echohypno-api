const { createClient } = require("@supabase/supabase-js");

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    // 🔽 TON CODE ACTUEL ICI (inchangé)
  } catch (e) {
    console.error("[compose error]", e);
    res.status(500).json({ error: "compose failed" });
  }
};
