import React from 'react';
import { paymentMethods } from '../data/paymentMethods';

export default function PaymentDetailsPanel({ selectedMethod }) {
  const [activeMethod, setActiveMethod] = React.useState('');

  React.useEffect(() => {
    setActiveMethod(selectedMethod || '');
  }, [selectedMethod]);

  if (!activeMethod) return null;

  const details = paymentMethods[activeMethod];
  if (!details) return null;

  if (activeMethod === 'MTN MOMO') {
    return (
      <aside className="paymentDetailsPanel" key={activeMethod}>
        <h3>MTN MOMO Payment Details:</h3>
        <p><span>Account Name:</span> <strong>{details.accountName}</strong></p>
        <p><span>MOMO Number:</span> <strong>{details.number}</strong></p>
      </aside>
    );
  }

  if (activeMethod === 'Orange OM') {
    return (
      <aside className="paymentDetailsPanel" key={activeMethod}>
        <h3>Orange OM Payment Details:</h3>
        <p><span>Account Name:</span> <strong>{details.accountName}</strong></p>
        <p><span>OM Number:</span> <strong>{details.number}</strong></p>
      </aside>
    );
  }

  if (activeMethod === 'PayPal') {
    return (
      <aside className="paymentDetailsPanel" key={activeMethod}>
        <h3>PayPal Payment Details:</h3>
        <p><span>Account:</span> <strong>{details.email}</strong></p>
      </aside>
    );
  }

  return (
    <aside className="paymentDetailsPanel" key={activeMethod}>
      <h3>Cash Payment Location:</h3>
      {details.location.split(' - ').map((line) => (
        <p key={line}><strong>{line}</strong></p>
      ))}
    </aside>
  );
}
