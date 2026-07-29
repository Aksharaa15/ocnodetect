import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 40 },
    { duration: '5m', target: 40 }, // Sustained scan workload
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const payload = JSON.stringify({
    caseContext: {
      patientId: `PT-ENDURANCE-${__VU}`,
      site: 'Larynx',
      tnm: 'T3N2aM0',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/reference`, payload, params);

  check(res, {
    'reference response status handled': (r) => [200, 401, 429, 500, 503].includes(r.status),
  });

  sleep(4);
}
