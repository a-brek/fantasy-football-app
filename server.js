const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;
const LEAGUE_ID = '532886';

// Enable CORS for all origins (adjust in production)
app.use(cors());

// Current season ESPN Fantasy API proxy (2024)
const espnProxy = createProxyMiddleware({
  target: 'https://lm-api-reads.fantasy.espn.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/espn': `/apis/v3/games/ffl/seasons/2024/segments/0/leagues/${LEAGUE_ID}`
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ 
      error: 'ESPN API request failed', 
      message: err.message,
      details: 'This is expected if you don\'t have access to the ESPN league or if ESPN is blocking requests'
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`ESPN API Response: ${proxyRes.statusCode} for ${req.originalUrl}`);
  }
});

// Historical data proxy for modern API (2018+)
const historicalModernProxy = createProxyMiddleware({
  target: 'https://lm-api-reads.fantasy.espn.com',
  changeOrigin: true,
  router: (req) => {
    // Extract year from URL path
    const year = req.url.match(/\/historical\/(\d{4})/)?.[1];
    const view = req.query.view || 'mTeam';
    if (year) {
      return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${LEAGUE_ID}?view=${view}`;
    }
    return 'https://lm-api-reads.fantasy.espn.com';
  },
  pathRewrite: (path, req) => {
    // Remove the /api/espn/historical/YYYY part and just return the query params
    const year = req.url.match(/\/historical\/(\d{4})/)?.[1];
    const view = req.query.view || 'mTeam';
    return `/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${LEAGUE_ID}?view=${view}`;
  },
  onError: (err, req, res) => {
    console.error('Historical proxy error:', err.message);
    res.status(500).json({ 
      error: 'Historical ESPN API request failed', 
      message: err.message,
      year: req.url.match(/\/historical\/(\d{4})/)?.[1] || 'unknown'
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    const year = req.originalUrl.match(/\/historical\/(\d{4})/)?.[1];
    console.log(`Historical ESPN API Response: ${proxyRes.statusCode} for ${year}`);
  }
});

// Legacy API proxy for old seasons (2010-2017)
const legacyProxy = createProxyMiddleware({
  target: 'https://lm-api-reads.fantasy.espn.com',
  changeOrigin: true,
  router: (req) => {
    // Extract year from URL path
    const year = req.url.match(/\/legacy\/(\d{4})/)?.[1];
    const view = req.query.view || 'mTeam';
    if (year) {
      return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${LEAGUE_ID}?seasonId=${year}&view=${view}`;
    }
    return 'https://lm-api-reads.fantasy.espn.com';
  },
  pathRewrite: (path, req) => {
    // Remove the /api/espn/legacy/YYYY part 
    const year = req.url.match(/\/legacy\/(\d{4})/)?.[1];
    const view = req.query.view || 'mTeam';
    return `/apis/v3/games/ffl/leagueHistory/${LEAGUE_ID}?seasonId=${year}&view=${view}`;
  },
  onError: (err, req, res) => {
    console.error('Legacy proxy error:', err.message);
    const year = req.url.match(/\/legacy\/(\d{4})/)?.[1];
    console.log(`⚠️ Legacy API failed for ${year} - this is expected as ESPN's legacy API may not be available`);
    
    // Return error for legacy years when API is not available
    res.status(500).json({ 
      error: 'Legacy ESPN API request failed', 
      message: err.message,
      year: year || 'unknown'
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    const year = req.originalUrl.match(/\/legacy\/(\d{4})/)?.[1];
    console.log(`Legacy ESPN API Response: ${proxyRes.statusCode} for ${year}`);
  }
});

// Use the proxies for ESPN API calls
app.use('/api/espn/historical/', historicalModernProxy);
app.use('/api/espn/legacy/', legacyProxy);
app.use('/api/espn', espnProxy);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Fantasy Football API Proxy',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏈 Fantasy Football API Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying ESPN Fantasy API calls to avoid CORS issues`);
  console.log(`💡 Frontend should call: http://localhost:${PORT}/api/espn?view=mStandings`);
  console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
});