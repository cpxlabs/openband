import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelConfig {
  rewrites?: VercelRewrite[];
}

describe('Vercel Routing Rewrite Rules', () => {
  const configPath = path.resolve(__dirname, '../vercel.json');
  
  it('should load vercel.json successfully', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf8')) as VercelConfig;
    expect(content).toBeDefined();
    expect(content.rewrites).toBeInstanceOf(Array);
  });

  it('should rewrite SPA routes to index.html and exclude API paths', () => {
    const content = JSON.parse(fs.readFileSync(configPath, 'utf8')) as VercelConfig;
    const rewrites = content.rewrites || [];
    
    // Find the SPA rewrite rule
    const spaRule = rewrites.find(r => r.destination === '/index.html' || r.destination === '/');
    expect(spaRule).toBeDefined();
    
    // The source pattern should be a RegExp-compatible SPA pattern
    // e.g., "/((?!api/).*)"
    const sourcePattern = spaRule!.source;
    
    // Convert Vercel source pattern wildcards/groups to JS RegExp
    // Vercel routes like /((?!api/).*) map perfectly to JS RegExp
    const cleanPattern = sourcePattern
      .replace(/:path\*/g, '.*')
      .replace(/:path/g, '[^/]+');
      
    const routeRegex = new RegExp(`^${cleanPattern}$`);

    // SPA routes that SHOULD be rewritten
    expect(routeRegex.test('/')).toBe(true);
    expect(routeRegex.test('/login')).toBe(true);
    expect(routeRegex.test('/studio')).toBe(true);
    expect(routeRegex.test('/studio/123')).toBe(true);
    expect(routeRegex.test('/library')).toBe(true);

    // API routes that SHOULD NOT be rewritten (should return false)
    expect(routeRegex.test('/api/health')).toBe(false);
    expect(routeRegex.test('/api/extract')).toBe(false);
    expect(routeRegex.test('/api/stems/test.wav')).toBe(false);
  });
});
