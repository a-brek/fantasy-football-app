const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const port = 3000;

// General proxy to handle all ESPN API requests
app.get('/api/espn', async (req, res) => {
  const { leagueId, view } = req.query; // Get leagueId and view from query parameters

  // Default leagueId and view if not provided in the query
  const league = leagueId || '532886'; // Replace with default league ID if needed
  const viewParam = view || 'mMatchup'; // Default to 'mMatchup' if no view is provided

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/${league}?view=${viewParam}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Cookie': 'espn_s2=AECZ500BdAybYWl%2FQnKxrVtntcCIf0UJDYK0bSDkDsPOnLBZRksYpq0%2FIzBPa%2BA%2BO49TdD1zd%2Bil45oCSvaOIbT6GYzdYq8GICJsIK6szFCz%2BzV%2BSS7KAZVeIMmB3Px56eYeuTmOxuj5mUo58bIIuT8I7o1hOBm1PFi2pvdpDT4RhbrLAGhqz1m5avquxfad81G3WdOEVtT2x0NhnovvZ44%2F9iAB2UU4FbxQYh9GBqOepBUs3Bw4opqCpdSwWzUnGP8%2F%2FpI3hDWXsHAeW4iu2PJK1y8%2FNPwoB6Ot86SaPjmY5JH%2Bn%2FvNds8j3vwCnvK6dc4%3D; SWID={49CF12E7-513C-4ACD-B465-371F5127E2A7}', // Replace with your ESPN cookies
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://fantasy.espn.com',
        'Origin': 'https://fantasy.espn.com'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from ESPN API' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
