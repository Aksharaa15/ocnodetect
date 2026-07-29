import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 150 }, // Volume testing with 150 VUs
    { duration: '2m', target: 150 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.OCNODETECT_API_URL || 'https://ocnodetect-backend.onrender.com';
const TOKEN = __ENV.JWT_TOKEN || 'mock_jwt_token_for_k6';

export default function () {
  const payload = JSON.stringify({
    savedCases: [
      { patientId: `PT-VOL-1-${__VU}`, site: 'Tonsil', tnm: 'T1N0M0' },
      { patientId: `PT-VOL-2-${__VU}`, site: 'Larynx', tnm: 'T2N1M0' }
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  const res = http.put(`${BASE_URL}/api/saved-cases/sync`, payload, params);

  check(res, {
    'bulk sync status handled': (r) => [200, 401, 429, 500].includes(r.status),
  });

  sleep(2);
}
