require('dotenv').config(); // Load environment variables from .env file
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
  pathRewrite: (path, req) => {
    // Extract year from URL path
    const year = req.url.match(/\/historical\/(\d{4})/)?.[1];
    const queryParams = new URLSearchParams(req.query).toString();
    const queryString = queryParams ? `?${queryParams}` : '';
    return `/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${LEAGUE_ID}${queryString}`;
  },
  headers: {
    // Add ESPN authentication cookies if available
    // Users need to provide these from their ESPN login session
    'Cookie': process.env.ESPN_S2 && process.env.SWID ? 
      `espn_s2=${process.env.ESPN_S2}; SWID=${process.env.SWID}` : '',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  onError: (err, req, res) => {
    const year = req.url.match(/\/historical\/(\d{4})/)?.[1];
    console.error(`Historical proxy error for ${year}:`, err.message);
    
    // Handle authentication errors for historical data
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      const hasAuth = process.env.ESPN_S2 && process.env.SWID;
      console.log(`🔒 Authentication required for ${year} historical data`);
      console.log(`   Current auth status: ${hasAuth ? 'Configured' : 'Missing ESPN cookies'}`);
      
      res.status(401).json({ 
        error: 'Authentication required', 
        message: hasAuth 
          ? `Historical data for ${year} requires valid ESPN login cookies (cookies may be expired)`
          : `Historical data for ${year} requires ESPN login authentication. Set ESPN_S2 and SWID environment variables.`,
        year: year || 'unknown',
        hasAuthentication: hasAuth,
        instructions: {
          step1: 'Log into ESPN Fantasy Football in your browser',
          step2: 'Open Developer Tools (F12) → Application/Storage → Cookies',
          step3: 'Find espn_s2 and SWID cookie values',
          step4: 'Set environment variables: ESPN_S2=<value> SWID=<value>',
          step5: 'Restart the server'
        }
      });
    } else {
      res.status(500).json({ 
        error: 'Historical ESPN API request failed', 
        message: err.message,
        year: year || 'unknown'
      });
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    const year = req.originalUrl.match(/\/historical\/(\d{4})/)?.[1];
    console.log(`Historical ESPN API Response: ${proxyRes.statusCode} for ${year}`);
    
    if (proxyRes.statusCode === 401) {
      console.log(`🔒 Authentication required for ${year} historical data`);
    }
  }
});

// Legacy API proxy for old seasons (2010-2017)
const legacyProxy = createProxyMiddleware({
  target: 'https://lm-api-reads.fantasy.espn.com',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Extract year from URL path
    const year = req.url.match(/\/legacy\/(\d{4})/)?.[1];
    const queryParams = new URLSearchParams(req.query).toString();
    const baseQuery = `seasonId=${year}`;
    const fullQuery = queryParams ? `${baseQuery}&${queryParams}` : baseQuery;
    return `/apis/v3/games/ffl/leagueHistory/${LEAGUE_ID}?${fullQuery}`;
  },
  headers: {
    // Add ESPN authentication cookies for legacy API access
    'Cookie': process.env.ESPN_S2 && process.env.SWID ? 
      `espn_s2=${process.env.ESPN_S2}; SWID=${process.env.SWID}` : '',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  onError: (err, req, res) => {
    const year = req.url.match(/\/legacy\/(\d{4})/)?.[1];
    console.error(`Legacy proxy error for ${year}:`, err.message);
    
    // Handle authentication errors for legacy data
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      const hasAuth = process.env.ESPN_S2 && process.env.SWID;
      console.log(`🔒 Authentication required for legacy ${year} data`);
      console.log(`   Current auth status: ${hasAuth ? 'Configured' : 'Missing ESPN cookies'}`);
      
      res.status(401).json({ 
        error: 'Authentication required', 
        message: hasAuth 
          ? `Legacy data for ${year} requires valid ESPN login cookies (cookies may be expired)`
          : `Legacy data for ${year} requires ESPN login authentication. Set ESPN_S2 and SWID environment variables.`,
        year: year || 'unknown',
        hasAuthentication: hasAuth,
        instructions: {
          step1: 'Log into ESPN Fantasy Football in your browser',
          step2: 'Open Developer Tools (F12) → Application/Storage → Cookies',
          step3: 'Find espn_s2 and SWID cookie values',
          step4: 'Set environment variables: ESPN_S2=<value> SWID=<value>',
          step5: 'Restart the server'
        }
      });
    } else {
      res.status(500).json({ 
        error: 'Legacy API request failed',
        message: `Failed to fetch legacy data for ${year}: ${err.message}`,
        year: year || 'unknown',
        suggestion: 'This may be due to authentication requirements or temporary ESPN API issues'
      });
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    const year = req.originalUrl.match(/\/legacy\/(\d{4})/)?.[1];
    console.log(`Legacy ESPN API Response: ${proxyRes.statusCode} for ${year}`);
    
    if (proxyRes.statusCode === 404) {
      console.log(`📚 Legacy API data not found for ${year} - may need authentication or data doesn't exist`);
    }
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
  const hasAuth = process.env.ESPN_S2 && process.env.SWID;
  
  console.log(`🏈 Fantasy Football API Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying ESPN Fantasy API calls to avoid CORS issues`);
  console.log(`💡 Frontend should call: http://localhost:${PORT}/api/espn?view=mStandings`);
  console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 API Endpoints:');
  console.log(`   Current Season: /api/espn?view=mTeam`);
  console.log(`   Historical: /api/espn/historical/2020?view=mTeam`);
  console.log(`   Legacy: /api/espn/legacy/2015?view=mTeam`);
  console.log('');
  
  if (hasAuth) {
    console.log('🔑 ESPN Authentication: ✅ CONFIGURED');
    console.log('   Historical data (2018-2020) should be accessible');
  } else {
    console.log('🔑 ESPN Authentication: ❌ NOT CONFIGURED');
    console.log('   Historical data (2018-2020) will return 401 errors');
    console.log('   To fix: Set ESPN_S2 and SWID environment variables');
    console.log('   See: https://github.com/cwendt94/espn-api/discussions/150');
  }
  console.log('');
});