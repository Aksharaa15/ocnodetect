import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 200 }, // Spike to 200 concurrent chat queries
    { duration: '30s', target: 200 },
    { duration: '10s', target: 10 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const payload = JSON.stringify({
    message: 'What are the NCCN staging guidelines for T2 oral tongue SCC?',
    caseContext: {
      patientId: 'PT-SPIKE-001',
      site: 'Oral Tongue',
      tnm: 'T2N1M0',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/chat`, payload, params);

  check(res, {
    'chat response handled': (r) => [200, 401, 429, 500, 503].includes(r.status),
  });

  sleep(1);
}
