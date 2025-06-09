
import { Shield } from 'lucide-react';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import SubscriptionButton from '@/components/SubscriptionButton';
import { useSubscription } from '@/hooks/useSubscription';

const SubscriptionCard = () => {
  const { subscribed } = useSubscription();

  return (
    <div className="mb-8">
      <SubscriptionStatus />
      {!subscribed && (
        <div className="mt-4">
          <SubscriptionButton />
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Datasäkerhet</h3>
            <p className="text-sm text-blue-700 mt-1">
              Dina personnummer är maskerade för säkerhet. Klicka på ögon-ikonen för att visa fullständig information när det behövs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
