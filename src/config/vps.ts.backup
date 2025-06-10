
// VPS Configuration
export const VPS_CONFIG = {
  // Base VPS URL
  VPS_URL: 'http://87.106.247.92:8080',
  
  // API Token for VPS authentication
  VPS_API_TOKEN: 'test-secret-token-12345',
  
  // VPS API Endpoints
  endpoints: {
    // Health check endpoint
    health: '/api/health',
    
    // Booking related endpoints
    booking: {
      start: '/api/booking/start',
      stop: '/api/booking/stop',
      status: '/api/booking/status',
      logs: '/api/booking/logs',
    },
    
    // User management endpoints
    users: {
      profile: '/api/users/profile',
      settings: '/api/users/settings',
    },
    
    // System endpoints
    system: {
      info: '/api/system/info',
      metrics: '/api/system/metrics',
    },
  },
  
  // Helper function to build full URLs
  buildUrl: (endpoint: string): string => {
    const baseUrl = 'http://87.106.247.92:8080';
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  },
  
  // Helper function to get headers with authentication
  getAuthHeaders: (): Record<string, string> => ({
    'Authorization': `Bearer test-secret-token-12345`,
    'Content-Type': 'application/json',
  }),
};

// Export individual values for convenience
export const VPS_URL = VPS_CONFIG.VPS_URL;
export const VPS_API_TOKEN = VPS_CONFIG.VPS_API_TOKEN;

// Export default configuration
export default VPS_CONFIG;
