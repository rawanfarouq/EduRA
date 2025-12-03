// src/pages/StudentPayment.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getJSON, postAuthJSON } from "../lib/api";
import Swal from "sweetalert2";


export default function StudentPayment() {
  const { bookingId } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [paying, setPaying] = useState(false);
  const [provider, setProvider] = useState("stripe"); // 'stripe' | 'paypal'

  // card form
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    async function loadBookings() {
      setLoading(true);
      setErr("");
      try {
        const data = await getJSON("/api/bookings/mine");
        setBookings(data.bookings || []);
      } catch (e) {
        setErr(e.message || "Failed to load booking");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [user, navigate]);

  const booking = useMemo(
    () => bookings.find((b) => b._id === bookingId),
    [bookings, bookingId]
  );

  const course = booking?.courseId || {};
  const tutor = booking?.tutorId || {};
  const start = booking?.start
    ? new Date(booking.start).toLocaleString()
    : "—";

  const canPay = booking?.status === "awaiting_payment";

  // ✅ Prefer booking.price, fall back to course.price, and normalize to number
  const rawPrice = booking?.price ?? course?.price;
  const numericPrice =
    rawPrice !== undefined && rawPrice !== null && rawPrice !== "" &&
    !isNaN(Number(rawPrice))
      ? Number(rawPrice)
      : null;

  // 🔢 Ensure card number is digits only and max 16 digits
  function handleCardNumberChange(e) {
    let value = e.target.value || "";
    value = value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    setCardNumber(value);
  }

  async function handlePay() {
    if (!booking?._id || !canPay) return;

    setErr("");

    if (provider === "stripe") {
      if (!cardNumber || !expMonth || !expYear || !cvc) {
        setErr("Please fill in all card details.");
        return;
      }
    }

    const ok = window.confirm(
      `Proceed to pay for "${course.title || "this course"}" using ${
        provider === "stripe" ? "Stripe (card)" : "PayPal"
      }?`
    );
    if (!ok) return;

    try {
      setPaying(true);

      const payload = {
        bookingId: booking._id,
        provider,
      };

      if (provider === "stripe") {
        payload.cardNumber = cardNumber;
        payload.expMonth = expMonth;
        payload.expYear = expYear;
        payload.cvc = cvc;
      }

      // eslint-disable-next-line no-unused-vars
      const data = await postAuthJSON("/api/payments/pay-booking", payload);

      Swal.fire({
  title: "Payment Successful",
  text: "You are now enrolled in the course.",
  icon: "success",
  confirmButtonText: "OK",
  confirmButtonColor: "#3085d6",
}).then(() => {
  // Redirect AFTER user clicks OK
  navigate("/student/enrollments");
});
    } catch (e) {
      setErr(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  if (!bookingId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-6 bg-white shadow rounded-xl">
          <p className="text-sm text-red-600">Missing booking ID.</p>
          <button
            onClick={() => navigate("/student/bookings")}
            className="px-4 py-2 mt-3 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Back to my bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl px-4 py-8 mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">
              Complete Payment
            </h1>
            <p className="text-gray-600">
              Choose your payment method and confirm your booking.
            </p>
          </div>

          <button
            onClick={() => navigate("/student/bookings")}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            ⬅ Back to Bookings
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading booking details…</p>
        ) : err && !booking ? (
          <div className="px-4 py-2 mb-4 text-sm text-red-700 border border-red-200 rounded bg-red-50">
            {err}
          </div>
        ) : !booking ? (
          <p className="text-sm text-gray-500">
            Booking not found or does not belong to you.
          </p>
        ) : (
          <>
            {err && (
              <div className="px-4 py-2 mb-4 text-sm text-red-700 border border-red-200 rounded bg-red-50">
                {err}
              </div>
            )}

            {/* Booking summary */}
            <div className="p-4 mb-4 bg-white border border-gray-100 rounded-xl">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {course.title || "Untitled course"}
              </h2>
              <p className="text-sm text-gray-600">
                Tutor:{" "}
                {tutor?.userId?.name || tutor?.name || "To be announced"}
              </p>
              <p className="mt-1 text-sm text-gray-600">When: {start}</p>
              <p className="mt-1 text-sm text-gray-600">
                Price:{" "}
                <strong>
                  {numericPrice !== null ? `$${numericPrice}` : "Free"}
                </strong>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Booking status: <strong>{booking.status}</strong>
              </p>
            </div>

            {/* Payment methods */}
            <div className="p-4 bg-white border border-gray-100 rounded-xl">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Choose payment method
              </h3>

              <div className="flex gap-3 mb-4 text-sm">
                <button
                  type="button"
                  onClick={() => setProvider("stripe")}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    provider === "stripe"
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  💳 Stripe (Card)
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("paypal")}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    provider === "paypal"
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  🅿 PayPal
                </button>
              </div>

              {/* Card form for Stripe */}
              {provider === "stripe" && (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">
                      Card number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={16}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="1234567812345678"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      You can use any card number (digits only, up to 16 digits).
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Expiry month
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="MM"
                        value={expMonth}
                        onChange={(e) => setExpMonth(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        Expiry year
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="YYYY"
                        value={expYear}
                        onChange={(e) => setExpYear(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 text-xs font-medium text-gray-700">
                        CVC
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g. 343"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {provider === "paypal" && (
                <p className="mt-1 text-xs text-gray-600">
                  This will simulate a PayPal payment. Some transactions will be
                  randomly declined to mimic real behavior.
                </p>
              )}

              {!canPay && (
                <p className="px-3 py-2 mt-3 text-xs text-yellow-700 border border-yellow-200 rounded bg-yellow-50">
                  This booking is currently <strong>{booking.status}</strong>.{" "}
                  Payment is only available when status is{" "}
                  <strong>awaiting_payment</strong>.
                </p>
              )}

              <button
                disabled={!canPay || paying}
                onClick={handlePay}
                className="w-full px-4 py-2 mt-4 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
              >
                {paying ? "Processing payment…" : "Pay now"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
