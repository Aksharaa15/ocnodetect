import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 VUs
    { duration: '3m', target: 100 },  // Sustained load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.get(`${BASE_URL}/api/dashboard`, params);

  check(res, {
    'dashboard status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'dashboard response has stats': (r) => r.status === 200 ? r.json().hasOwnProperty('stats') : true,
  });

  sleep(2);
}
