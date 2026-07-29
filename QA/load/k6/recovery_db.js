import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },   // Simulates DB disconnect / restart downtime
    { duration: '30s', target: 50 },  // Verification of connection pool auto-recovery
  ],
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
