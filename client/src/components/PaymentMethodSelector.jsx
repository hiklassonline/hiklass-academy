import { Check, MapPin, Smartphone, WalletCards } from 'lucide-react';
import { paymentMethodOptions } from '../data/paymentMethods';

function PaymentMethodIcon({ method }) {
  if (method === 'MTN MOMO') return <Smartphone size={28} aria-hidden="true" />;
  if (method === 'Orange OM') return <WalletCards size={28} aria-hidden="true" />;
  if (method === 'PayPal') {
    return (
      <span className="paymentMethodLogo paypal" aria-hidden="true">
        P
      </span>
    );
  }
  return <MapPin size={28} aria-hidden="true" />;
}

export default function PaymentMethodSelector({ selectedMethod, onSelectMethod }) {
  return (
    <div className="paymentMethodCards">
      {paymentMethodOptions.map(({ id, label, description }) => {
        const selected = selectedMethod === id;
        return (
          <button
            key={id}
            type="button"
            className={`paymentMethodCard ${selected ? 'selected' : ''}`}
            onClick={() => onSelectMethod(id)}
            aria-pressed={selected}
          >
            <div className="paymentMethodCardHeader">
              <PaymentMethodIcon method={id} />
              <strong>{label}</strong>
              {selected ? (
                <span className="paymentMethodCheck" aria-hidden="true">
                  <Check size={16} />
                </span>
              ) : null}
            </div>
            <p className="paymentMethodDesc">{description}</p>
            {selected ? <span className="paymentMethodBadge">Selected</span> : null}
          </button>
        );
      })}
    </div>
  );
}
