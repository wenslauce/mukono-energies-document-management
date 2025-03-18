import { SupportedCurrency } from "@/lib/utils"

interface PaymentDetailsProps {
  paymentInstructions?: {
    bank_name?: string
    account_name?: string
    account_number?: string
    bank_code?: string
    branch_name?: string
    swift_code?: string
    mpesa?: string
    airtel_money?: string
  }
  currency?: SupportedCurrency
}

export function PaymentDetails({ paymentInstructions, currency }: PaymentDetailsProps) {
  if (!paymentInstructions) return null
  
  const {
    bank_name,
    account_name,
    account_number,
    bank_address,
    branch_name,
    swift_code,
    mpesa,
    airtel_money,
  } = paymentInstructions

  const hasBankDetails = bank_name || account_name || account_number
  const hasMobileMoney = mpesa || airtel_money

  if (!hasBankDetails && !hasMobileMoney) return null

  return (
    <div className="font-sans">
      <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide">Payment Details</h2>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        {hasBankDetails && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Bank Transfer</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {bank_name && (
                <>
                  <p className="text-gray-600">Bank:</p>
                  <p className="font-medium">{bank_name}</p>
                </>
              )}
              {account_name && (
                <>
                  <p className="text-gray-600">Account Name:</p>
                  <p className="font-medium">{account_name}</p>
                </>
              )}
              {account_number && (
                <>
                  <p className="text-gray-600">Account Number:</p>
                  <p className="font-medium">{account_number}</p>
                </>
              )}
              {swift_code && (
                <>
                  <p className="text-gray-600">SWIFT Code:</p>
                  <p className="font-medium">{swift_code}</p>
                </>
              )}
              {bank_address && (
                <>
                  <p className="text-gray-600">Bank Address:</p>
                  <p className="font-medium">{bank_address}</p>
                </>
              )}
              {branch_name && (
                <>
                  <p className="text-gray-600">Branch:</p>
                  <p className="font-medium">{branch_name}</p>
                </>
              )}
            </div>
          </div>
        )}

        {hasMobileMoney && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Mobile Money</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {mpesa && (
                <>
                  <p className="text-gray-600">M-Pesa:</p>
                  <p className="font-medium">{mpesa}</p>
                </>
              )}
              {airtel_money && (
                <>
                  <p className="text-gray-600">Airtel Money:</p>
                  <p className="font-medium">{airtel_money}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

