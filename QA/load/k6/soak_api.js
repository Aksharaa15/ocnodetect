import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 30 },
    { duration: '10m', target: 30 }, // Sustained 10-minute soak test
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
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

  const res1 = http.get(`${BASE_URL}/api/profile`, params);
  const res2 = http.get(`${BASE_URL}/api/saved-cases`, params);
  const res3 = http.get(`${BASE_URL}/api/chat-sessions`, params);

  check(res1, { 'profile status 200/401': (r) => [200, 401].includes(r.status) });
  check(res2, { 'saved-cases status 200/401': (r) => [200, 401].includes(r.status) });
  check(res3, { 'chat-sessions status 200/401': (r) => [200, 401].includes(r.status) });

  sleep(3);
}
