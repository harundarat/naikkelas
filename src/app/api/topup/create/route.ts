import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { topupTransactions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { createFlipBill, getPackage, formatExpiredDate, PackageId } from '@/lib/flip';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.warn('Topup request failed: User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId } = body as { packageId: PackageId };

    if (!packageId) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    const selectedPackage = getPackage(packageId);
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Get user profile for sender details
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    const senderName = userProfile?.name || 'User';
    const senderEmail = user.email || 'user@example.com';

    // Create Flip bill
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const flipBill = await createFlipBill({
      title: `Naikkelas Credit Topup - ${selectedPackage.name} (${selectedPackage.credits} credits)`,
      amount: selectedPackage.amount,
      type: 'SINGLE',
      expired_date: formatExpiredDate(24), // 24 hours from now
      redirect_url: `${siteUrl}?topup=success`,
      sender_name: senderName,
      sender_email: senderEmail,
      step: 2, // Step 2 = show payment instructions directly
    });

    // Store transaction in database
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.insert(topupTransactions).values({
      id: transactionId,
      userId: user.id,
      flipBillId: flipBill.link_id.toString(),
      flipBillLink: flipBill.link_url,
      amount: selectedPackage.amount,
      credits: selectedPackage.credits,
      status: 'PENDING',
    });

    logger.info('Topup transaction created', {
      transactionId,
      userId: user.id,
      packageId,
      amount: selectedPackage.amount,
      credits: selectedPackage.credits,
      flipBillId: flipBill.link_id,
    });

    return NextResponse.json({
      transactionId,
      billLink: flipBill.link_url,
      billId: flipBill.link_id.toString(),
      amount: selectedPackage.amount,
      credits: selectedPackage.credits,
    });

  } catch (error: any) {
    logger.error('Failed to create topup transaction', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to create topup transaction' },
      { status: 500 }
    );
  }
}
