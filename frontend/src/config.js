// Detect if we're in production (hosted on ftcemp.byui.edu)
const isProduction = window.location.hostname === 'ftcemp.byui.edu';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isProduction ? 'https://ftcemp.byui.edu/snacks-api' : 'http://localhost:3000');
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 
  (isProduction ? 'https://ftcemp.byui.edu/snacks' : 'http://localhost:5173');


