// src/app/api/forge/oauth/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface ForgeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
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

  const tokenUrl = 'https://developer.api.autodesk.com/authentication/v2/token';

  // Encode Client ID and Client Secret to Base64
  const credentials = `${FORGE_CLIENT_ID}:${FORGE_CLIENT_SECRET}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': `Basic ${encodedCredentials}`,
  };

  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('scope', 'data:read'); // Sesuaikan scope jika diperlukan, misalnya 'viewables:read'

  try {
    const response = await axios.post<ForgeTokenResponse>(tokenUrl, body, {
      headers,
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching Forge token:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch access token' },
      { status: 500 }
    );
  }
}