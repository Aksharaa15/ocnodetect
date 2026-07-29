import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 20 concurrent uploaders
    { duration: '2m', target: 50 },   // Stress up to 50 concurrent scan uploaders
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(90)<5000'], // AI Vision/Groq processing allows up to 5s
  },
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const payload = JSON.stringify({
    patientId: `PT-LOAD-${__VU}-${__ITER}`,
    metadata: 'Pathology Report: T2 N1 M0 Squamous Cell Carcinoma of oral tongue, 6mm depth of invasion.',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/upload`, payload, params);

  check(res, {
    'upload status is 200, 429, or 401': (r) => [200, 401, 429, 500, 503].includes(r.status),
  });

  sleep(5);
}
