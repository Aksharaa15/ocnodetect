import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 300 }, // Burst of 300 users
    { duration: '30s', target: 300 },
    { duration: '10s', target: 0 },
  ],
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';

export default function () {
  const payload = JSON.stringify({
    email: `burst_user_${__VU}@ocnodetect.test`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/forgot-password`, payload, params);

  check(res, {
    'forgot password status handled': (r) => [200, 429, 503].includes(r.status),
  });

  sleep(1);
}
