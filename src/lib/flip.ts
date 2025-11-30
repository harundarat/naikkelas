import { logger } from './logger';

// Credit packages configuration (1:1 ratio - credits equal rupiah amount)
export const CREDIT_PACKAGES = {
  starter: { credits: 10000, amount: 10000, name: 'Starter' },
  basic: { credits: 25000, amount: 25000, name: 'Basic' },
  pro: { credits: 50000, amount: 50000, name: 'Pro' },
  premium: { credits: 100000, amount: 100000, name: 'Premium' },
} as const;

// Minimum credits required to start a chat
export const MINIMUM_CREDITS_THRESHOLD = 1000;

export type PackageId = keyof typeof CREDIT_PACKAGES;

export interface FlipBillRequest {
  title: string;
  amount: number;
  type: 'SINGLE' | 'MULTIPLE';
  expired_date: string;
  redirect_url: string;
  sender_name: string;
  sender_email: string;
  sender_phone_number?: string;
  sender_address?: string;
  step: number;
}

export interface FlipBillResponse {
  link_id: number;
  link_url: string;
  title: string;
  type: string;
  amount: number;
  redirect_url: string;
  expired_date: string;
  created_from: string;
  status: string;
  step: number;
  customer: {
    name: string;
    email: string;
    phone_number: string;
    address: string;
  };
  bill_payment: {
    id: number;
    amount: number;
    unique_code: number;
    status: string;
    sender_bank: string;
    sender_bank_type: string;
    receiver_bank_account: {
      account_number: string;
      account_type: string;
      bank_code: string;
      account_holder: string;
    };
  };
}

export interface FlipCallbackData {
  id: string;
  bill_link: string;
  bill_link_id: number;
  bill_title: string;
  sender_name: string;
  sender_bank: string;
  sender_bank_type: string;
  amount: number;
  status: string;
  settlement_status: string;
  created_at: string;
}

const FLIP_API_URL = process.env.FLIP_API_URL || 'https://bigflip.id/big_sandbox_api/v2';
const FLIP_SECRET_KEY = process.env.FLIP_SECRET_KEY || '';

function getAuthHeader(): string {
  // Flip uses Basic Auth with secret key as username and empty password
  const credentials = `${FLIP_SECRET_KEY}:`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  return `Basic ${base64Credentials}`;
}

export async function createFlipBill(params: FlipBillRequest): Promise<FlipBillResponse> {
  logger.info('Creating Flip bill', { title: params.title, amount: params.amount });

  const formData = new URLSearchParams();
  formData.append('title', params.title);
  formData.append('amount', params.amount.toString());
  formData.append('type', params.type);
  formData.append('expired_date', params.expired_date);
  formData.append('redirect_url', params.redirect_url);
  formData.append('sender_name', params.sender_name);
  formData.append('sender_email', params.sender_email);
  formData.append('step', params.step.toString());

  if (params.sender_phone_number) {
    formData.append('sender_phone_number', params.sender_phone_number);
  }
  if (params.sender_address) {
    formData.append('sender_address', params.sender_address);
  }

  const response = await fetch(`${FLIP_API_URL}/pwf/bill`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Failed to create Flip bill', { status: response.status, error: errorText });
    throw new Error(`Failed to create Flip bill: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Ensure link_url has proper protocol prefix
  if (data.link_url && !data.link_url.startsWith('http')) {
    data.link_url = `https://${data.link_url}`;
  }

  logger.info('Flip bill created successfully', { linkId: data.link_id, linkUrl: data.link_url });
  return data;
}

export function validateFlipCallback(token: string): boolean {
  let validationToken = process.env.FLIP_VALIDATION_TOKEN || '';

  // Handle escaped $ characters from Vercel env vars
  // Vercel interprets $ as variable reference, so we escape with \$
  validationToken = validationToken.replace(/\\\$/g, '$');

  return token === validationToken;
}

export function formatExpiredDate(hoursFromNow: number = 24): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  // Format: YYYY-MM-DD HH:mm
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function getPackage(packageId: string): typeof CREDIT_PACKAGES[PackageId] | null {
  if (packageId in CREDIT_PACKAGES) {
    return CREDIT_PACKAGES[packageId as PackageId];
  }
  return null;
}
