const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
const port = 3001;

// Helper function to fetch data for multiple years using both endpoints
const fetchDataForYears = async (leagueId, years, view) => {
  const requests = years.map(async (year) => {
    const url = year > 2018 
      ? `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=${view}`
      : `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?seasonId=${year}&view=${view}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Cookie': 'espn_s2=AECZ500BdAybYWl%2FQnKxrVtntcCIf0UJDYK0bSDkDsPOnLBZRksYpq0%2FIzBPa%2BA%2BO49TdD1zd%2Bil45oCSvaOIbT6GYzdYq8GICJsIK6szFCz%2BzV%2BSS7KAZVeIMmB3Px56eYeuTmOxuj5mUo58bIIuT8I7o1hOBm1PFi2pvdpDT4RhbrLAGhqz1m5avquxfad81G3WdOEVtT2x0NhnovvZ44%2F9iAB2UU4FbxQYh9GBqOepBUs3Bw4opqCpdSwWzUnGP8%2F%2FpI3hDWXsHAeW4iu2PJK1y8%2FNPwoB6Ot86SaPjmY5JH%2Bn%2FvNds8j3vwCnvK6dc4%3D; SWID={49CF12E7-513C-4ACD-B465-371F5127E2A7}',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://fantasy.espn.com',
          'Origin': 'https://fantasy.espn.com'
        }
      });
      console.log(`Data fetched for year ${year}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data for year ${year} from URL ${url}:`, error.message);
      return { error: `Failed to fetch data for year ${year}` };
    }
  });

  // Wait for all requests to complete and return the data
  const responses = await Promise.all(requests);
  return responses;
};

// Endpoint for current season data
app.get('/api/espn/current', async (req, res) => {
  const { leagueId = '532886', view = 'mMatchup', year = '2024' } = req.query;

  try {
    const data = await fetchDataForYears(leagueId, [parseInt(year)], view);
    res.json(data[0]); // Return single season data for current year
  } catch (error) {
    res.status(500).json({ error: 'Error fetching current season data from ESPN API' });
  }
});

// Endpoint for historical data (multiple years)
app.get('/api/espn/history', async (req, res) => {
  const { leagueId = '532886', view = 'mMatchup', years } = req.query;

  if (!years) {
    return res.status(400).json({ error: 'Years parameter is required in the format years=2018,2019,2020' });
  }

  const yearsArray = years.split(',').map(Number);

  try {
    const data = await fetchDataForYears(leagueId, yearsArray, view);
    res.json(data); // Return an array of data for each year
  } catch (error) {
    res.status(500).json({ error: 'Error fetching historical data from ESPN API' });
  }
});

app.get('/api/espn/allYears', async (req, res) => {
  const { leagueId = '532886', view = 'mTeam' } = req.query;
  const startYear = parseInt(req.query.startYear) || 2010;  // Default to 2010 if not provided

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);
  console.log("Years to fetch:", years);

  try {
    const data = await fetchDataForYears(leagueId, years, view);
    console.log("Data fetched for all years:", data[0]);
    const errors = data.filter(response => response.error);

    if (errors.length) {
      console.error("Errors encountered in fetching data:", errors);
      return res.status(500).json({ error: 'Some data could not be fetched', details: errors });
    }

    res.json(data); // Return aggregated data for all years
  } catch (error) {
    console.error("Error in /api/espn/allYears endpoint:", error.message);
    res.status(500).json({ error: 'Error fetching data from ESPN API for all years' });
  }
});


// General endpoint for any specific season data
app.get('/api/espn', async (req, res) => {
  const { leagueId = '532886', view = 'mTeam', year = '2024' } = req.query;

  try {
    const data = await fetchDataForYears(leagueId, [parseInt(year)], view);
    res.json(data[0]); // Return single season data for specified year
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from ESPN API' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
