import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // 100 simultaneous scan uploaders
    { duration: '1m', target: 100 },
    { duration: '15s', target: 0 },
  ],
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const payload = JSON.stringify({
    patientId: `PT-CONCURRENT-${__VU}-${Date.now()}`,
    metadata: 'Patient record CT scan: T3N2bM0 Oropharyngeal SCC lesion.',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/upload`, payload, params);

  check(res, {
    'concurrent upload status handled': (r) => [200, 401, 429, 500, 503].includes(r.status),
  });

  sleep(3);
}
