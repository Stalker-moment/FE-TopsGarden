// src/app/api/forge/create-bucket/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface CreateBucketResponse {
  bucketKey: string;
  policyKey: string;
}

export async function POST(req: NextRequest) {
  const FORGE_CLIENT_ID = process.env.NEXT_PUBLIC_FORGE_CLIENT_ID;
  const FORGE_CLIENT_SECRET = process.env.NEXT_PUBLIC_FORGE_CLIENT_SECRET;

  if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Forge credentials are not set.' },
      { status: 500 }
    );
  }

  // Ganti dengan nama bucket yang unik
  const bucketKey = 'bucket-model-testing-akti-012025'; // Contoh: 'my-model-bucket-12345'

  // Mendapatkan Access Token terlebih dahulu
  const tokenUrl = 'https://developer.api.autodesk.com/authentication/v2/token';
  const credentials = `${FORGE_CLIENT_ID}:${FORGE_CLIENT_SECRET}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${encodedCredentials}`,
  };

  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('scope', 'data:write data:read bucket:create bucket:read');

  try {
    const tokenResponse = await axios.post<{ access_token: string }>(tokenUrl, body, { headers });
    const accessToken = tokenResponse.data.access_token;

    // Membuat bucket
    const bucketUrl = 'https://developer.api.autodesk.com/oss/v2/buckets';
    const bucketBody = {
      bucketKey: bucketKey,
      policyKey: 'transient', // Bisa 'transient', 'temporary', atau 'persistent'
    };

    const bucketResponse = await axios.post(bucketUrl, bucketBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(bucketResponse.data, { status: 200 });
  } catch (error: any) {
    console.error('Error creating bucket:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to create bucket' },
      { status: 500 }
    );
  }
}
