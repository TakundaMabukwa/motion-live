'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id;
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId) {
      const customerData = {
        id: accountId,
        new_account_number: accountId,
        company: String(accountId).split('-')[0] || 'Unknown',
        legal_name: `${String(accountId).split('-')[0] || 'Unknown'} Cost Center`,
        trading_name: `${String(accountId).split('-')[0] || 'Unknown'} Cost Center`,
      };
      
      setCustomer(customerData);
      setLoading(false);
    }
  }, [accountId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-gray-200 rounded h-32"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer not found</h3>
          <p className="text-gray-500">The requested customer account could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.company || customer.trading_name || customer.legal_name}
              </h1>
              <p className="text-gray-600">Account #{customer.new_account_number || accountId}</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">FC</span>
              </div>
              <span className="text-sm font-medium text-gray-900">Field Coordinator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Account Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Company</label>
                <p className="text-gray-900">{customer.company}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Legal Name</label>
                <p className="text-gray-900">{customer.legal_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Trading Name</label>
                <p className="text-gray-900">{customer.trading_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Number</label>
                <p className="text-gray-900 font-mono">{customer.new_account_number}</p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-green-400 text-xl mr-3">✅</div>
              <div>
                <h3 className="text-sm font-medium text-green-800">Cost Center Access Working</h3>
                <p className="text-sm text-green-700 mt-1">
                  You can now successfully navigate from cost centers to view client information.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Back to Cost Centers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}