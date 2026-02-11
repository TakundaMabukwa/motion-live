// BEFORE: Complex dual-table fetch (current approach)
const fetchCustomerData = async () => {
  try {
    // Step 1: Fetch from customers_grouped to find the group
    const groupResponse = await fetch('/api/customers-grouped?page=1&fetchAll=true');
    const groupData = await groupResponse.json();
    
    // Step 2: Find matching group in complex data structure
    const group = groupData.find(c => {
      const accounts = c.all_new_account_numbers || '';
      return accounts.split(',').map(a => a.trim()).some(acc => accountParam.includes(acc));
    });
    
    // Step 3: Fetch from customers table for actual data
    const customerResponse = await fetch('/api/customers/contact-info/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumbers: accountsArray })
    });
    
    // Step 4: Parse and find first customer
    const data = await customerResponse.json();
    const customers = data.customers || {};
    let firstCustomer = null;
    for (const accountNum of accountsArray) {
      if (customers[accountNum]) {
        firstCustomer = customers[accountNum];
        break;
      }
    }
    
    // Multiple state updates and error checks...
  } catch (error) {
    // Error handling...
  }
};

// AFTER: Simple single-table fetch (proposed approach)
const fetchCustomerData = async () => {
  try {
    const accountParam = searchParams?.get('account');
    
    // Single API call to customers table
    const response = await fetch(`/api/customers/by-account/${accountParam}`);
    if (!response.ok) throw new Error('Failed to fetch customer data');
    
    const customer = await response.json();
    setCustomerData(customer);
    setEditValues(customer);
    setValidationStatus(customer.customer_validated || false);
    
    console.log('Customer data loaded:', customer);
  } catch (error) {
    console.error('Error fetching customer data:', error);
    toast.error('Failed to load customer information: ' + error.message);
  } finally {
    setLoading(false);
  }
};