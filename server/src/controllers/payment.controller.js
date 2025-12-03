// controllers/payment.controller.js
import Booking from '../models/Booking.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';

export const payForBooking = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId, provider = 'stripe', cardNumber, expMonth, expYear, cvc } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    // 1) Load booking and make sure it belongs to this student
    const booking = await Booking.findById(bookingId).populate('courseId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.studentId) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    if (booking.status !== 'awaiting_payment') {
      return res
        .status(400)
        .json({ message: `Cannot pay booking in status "${booking.status}"` });
    }

    const course = booking.courseId;
    const amount = course?.price ?? 0;

    // 2) Fake payment validation logic (DEV MODE)
    // CVC rule:
    //  - last digit = 1  -> declined by bank
    //  - last digit = 2  -> insufficient funds
    //  - last digit = 3  -> paid (success)
    let paymentStatus = 'paid';
    let declineReason = '';

    if (provider === 'stripe') {
      if (!cardNumber || !expMonth || !expYear || !cvc) {
        return res
          .status(400)
          .json({ message: 'Missing card details', code: 'card_incomplete' });
      }

      const cvcStr = String(cvc).trim();

      if (!/^\d{3}$/.test(cvcStr)) {
        return res
          .status(400)
          .json({ message: 'CVC must be a 3-digit number', code: 'cvc_invalid' });
      }

      const lastDigit = cvcStr[cvcStr.length - 1];

      if (lastDigit === '1') {
        paymentStatus = 'failed';
        declineReason = 'Card was declined by the bank.';
      } else if (lastDigit === '2') {
        paymentStatus = 'failed';
        declineReason = 'Insufficient funds.';
      } else if (lastDigit === '3') {
        paymentStatus = 'paid';
      } else {
        // For testing, restrict to 1/2/3 to make behavior predictable
        return res.status(400).json({
          message: 'For testing, please use a CVC ending in 1, 2, or 3.',
          code: 'cvc_pattern_required',
        });
      }
    } else if (provider === 'paypal') {
      // You can keep this or also switch to a deterministic rule
      if (Math.random() < 0.2) {
        paymentStatus = 'failed';
        declineReason = 'PayPal could not authorize this transaction.';
      }
    }

    // 3) Create payment record
    const payment = await Payment.create({
      bookingId: booking._id,
      amount,
      currency: 'USD',
      provider,
      status: paymentStatus,
      providerMeta: {
        declineReason,
      },
    });

    if (paymentStatus === 'failed') {
      // do NOT change booking status / no enrollment
      return res.status(402).json({
        message: declineReason || 'Payment was declined.',
        paymentId: payment._id,
        status: 'failed',
      });
    }

    // 4) Payment success → create enrollment + confirm booking
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: booking.studentId, courseId: booking.courseId },
      {
        studentId: booking.studentId,
        courseId: booking.courseId,
        status: 'active',
        startedAt: new Date(),
      },
      { new: true, upsert: true },
    );

    payment.enrollmentId = enrollment._id;
    payment.status = 'paid';
    await payment.save();

    booking.status = 'confirmed';
    await booking.save();

    return res.json({
      message: 'Payment successful and enrollment created.',
      status: 'paid',
      paymentId: payment._id,
      enrollmentId: enrollment._id,
    });
  } catch (e) {
    console.error('payForBooking error:', e);
    res.status(500).json({ message: e.message || 'Payment error' });
  }
};