const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001;

// Enable CORS for all origins (adjust in production)
app.use(cors());

// ESPN Fantasy API proxy
const espnProxy = createProxyMiddleware({
  target: 'https://lm-api-reads.fantasy.espn.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/espn': '/apis/v3/games/ffl/seasons/2024/segments/0/leagues/532886'
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

// Use the proxy for ESPN API calls
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