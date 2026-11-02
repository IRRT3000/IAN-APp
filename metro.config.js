// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable symlink/cross-drive resolution if node_modules is a junction
try {
  const nodeModulesReal = fs.realpathSync(path.resolve(__dirname, 'node_modules'));
  if (nodeModulesReal !== path.resolve(__dirname, 'node_modules')) {
    config.watchFolders = [__dirname, nodeModulesReal];
  }
} catch {
  // Ignore
}

const prevEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const customMiddleware = (req, res, next) => {
      try {
        if (req.url && req.url.startsWith('/assets/')) {
          const u = new URL(req.url, 'http://localhost');
          let assetPath = u.searchParams.get('unstable_path');
          if (assetPath) {
            // Strip leading ./ or .\ before a Windows drive letter (e.g. ./D:/... -> D:/...)
            if (/^\.[/\\][a-zA-Z]:/.test(assetPath)) {
              assetPath = assetPath.slice(2);
            }
            if (fs.existsSync(assetPath)) {
              const stat = fs.statSync(assetPath);
              if (stat.isFile()) {
                res.writeHead(200, {
                  'Content-Type': 'application/octet-stream',
                  'Content-Length': stat.size,
                  'Access-Control-Allow-Origin': '*',
                });
                return fs.createReadStream(assetPath).pipe(res);
              }
            }
          }
        }
      } catch {
        // Fall back to standard middleware
      }
      return metroMiddleware(req, res, next);
    };

    return prevEnhanceMiddleware
      ? prevEnhanceMiddleware(customMiddleware, server)
      : customMiddleware;
  },
};

module.exports = config;
