export const paymentMethods = {
  'MTN MOMO': {
    name: 'MTN MOMO',
    description: 'Pay securely using MTN Mobile Money.',
    accountName: 'Tah Terence',
    number: '651251941',
  },
  'Orange OM': {
    name: 'Orange OM',
    description: 'Pay securely using Orange Money.',
    accountName: 'Tah Terence',
    number: '688189091',
  },
  PayPal: {
    name: 'PayPal',
    description: 'Pay securely using PayPal.',
    email: 'hiklassonline2018@gmail.com',
  },
  Cash: {
    name: 'Cash',
    description: 'Pay physically at HIKLASS Academy.',
    location: 'Beseke, Bonaberi, Douala - Beside OLA Petrol Station',
  },
};

export const paymentMethodOptions = Object.entries(paymentMethods).map(([id, method]) => ({
  id,
  label: method.name,
  description: method.description,
}));
