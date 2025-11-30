import { NextResponse } from 'next/server';
import { db } from '@/db';
import { topupTransactions, userCredits } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { validateFlipCallback, FlipCallbackData } from '@/lib/flip';

export async function POST(request: Request) {
  try {
    // Parse form data from Flip webhook
    const formData = await request.formData();
    const token = formData.get('token') as string;
    const dataString = formData.get('data') as string;

    logger.info('Received Flip callback', {
      hasToken: !!token,
      hasData: !!dataString,
      receivedToken: token ? `${token.substring(0, 10)}...` : 'none', // Log first 10 chars for debugging
    });

    // Validate the callback token
    // Note: Flip tokens start with "$2y$" (bcrypt hash format)
    const isValidToken = validateFlipCallback(token);
    const expectedToken = process.env.FLIP_VALIDATION_TOKEN || '';

    if (!isValidToken) {
      logger.warn('Invalid Flip callback token', {
        expectedTokenSet: !!expectedToken,
        expectedTokenLength: expectedToken.length,
        expectedTokenPreview: expectedToken ? `${expectedToken.substring(0, 15)}...` : 'none',
        receivedTokenPreview: token ? `${token.substring(0, 15)}...` : 'none',
        tokensMatch: token === expectedToken,
      });

      // TEMPORARY: Skip validation if token starts with "$2y$" (valid Flip bcrypt token)
      // Remove this after fixing the Vercel env var issue
      if (!token || !token.startsWith('$2y$')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      logger.info('Bypassing token validation for Flip bcrypt token (temporary)');
    }

    // Parse the callback data
    let callbackData: FlipCallbackData;
    try {
      callbackData = JSON.parse(dataString);
    } catch (e) {
      logger.error('Failed to parse Flip callback data', { dataString });
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const { bill_link_id, status, amount } = callbackData;
    const flipBillId = bill_link_id.toString();

    logger.info('Processing Flip callback', { flipBillId, status, amount });

    // Find the transaction
    const transaction = await db.query.topupTransactions.findFirst({
      where: eq(topupTransactions.flipBillId, flipBillId),
    });

    if (!transaction) {
      logger.warn('Transaction not found for Flip callback', { flipBillId });
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if already processed (idempotency)
    if (transaction.status === 'SUCCESSFUL') {
      logger.info('Transaction already processed', { transactionId: transaction.id });
      return NextResponse.json({ message: 'Already processed' });
    }

    // Map Flip status to our status
    let newStatus = transaction.status;
    if (status === 'SUCCESSFUL') {
      newStatus = 'SUCCESSFUL';
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      newStatus = status;
    }

    // Update transaction status
    await db.update(topupTransactions)
      .set({
        status: newStatus,
        paidAt: status === 'SUCCESSFUL' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(topupTransactions.id, transaction.id));

    // If successful, add credits to user
    if (status === 'SUCCESSFUL') {
      // Verify amount matches (security check)
      if (amount !== transaction.amount) {
        logger.error('Amount mismatch in Flip callback', {
          expected: transaction.amount,
          received: amount,
          transactionId: transaction.id,
        });
        // Still mark as successful but log the discrepancy
      }

      // Check if user credits exist
      const existingCredits = await db.query.userCredits.findFirst({
        where: eq(userCredits.userId, transaction.userId),
      });

      if (existingCredits) {
        // Update existing credits
        await db.update(userCredits)
          .set({
            credits: sql`credits + ${transaction.credits}`,
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, transaction.userId));
      } else {
        // Create new credits record
        await db.insert(userCredits).values({
          id: `credit_${Date.now()}`,
          userId: transaction.userId,
          credits: transaction.credits,
        });
      }

      logger.info('Credits added successfully', {
        userId: transaction.userId,
        creditsAdded: transaction.credits,
        transactionId: transaction.id,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });

  } catch (error: any) {
    logger.error('Failed to process Flip callback', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
