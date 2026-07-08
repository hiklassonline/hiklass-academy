export function statusBadgeClass(status) {
  return String(status || 'pending').toLowerCase().replace(/\s+/g, '');
}

const METHOD_STYLES = {
  'MTN MOMO': { background: '#FFD400', color: '#111827' },
  'Orange OM': { background: '#FFE3CC', color: '#9A3412' },
  PayPal: { background: '#DBEAFE', color: '#1D4ED8' },
  Cash: { background: '#E5E7EB', color: '#374151' },
};

export function paymentMethodStyle(method) {
  return METHOD_STYLES[method] || { background: '#E5E7EB', color: '#374151' };
}

export const ORDER_STATUS_LABEL = {
  Pending: 'Under Review',
  Confirmed: 'Confirmed',
  Paid: 'Paid',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Refunded: 'Refunded',
};

export const ORDER_STATUS_HELP = {
  Pending: 'Your enrollment is awaiting payment confirmation.',
  Confirmed: 'Your enrollment has been confirmed.',
  Paid: 'Payment received. Your enrollment is being processed.',
  Completed: 'This enrollment is complete.',
  Cancelled: 'This enrollment was cancelled.',
  Refunded: 'This enrollment was refunded.',
};

export const PAYMENT_STATUS_HELP = {
  Pending: 'Payment has not been confirmed yet.',
  Paid: 'Payment completed successfully.',
  Cancelled: 'Payment was cancelled.',
};
