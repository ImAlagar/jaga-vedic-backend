// src/utils/emailHelpers.js
export function getCurrencySymbol(currency = 'USD') {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥'
  };
  return symbols[currency] || '$';
}

// Remove the old convertCurrency function since we're using the service now
export function formatProductDetails(item) {
  const details = [];
  if (item.size && item.size !== 'N/A' && item.size !== 'One Size' && item.size !== 'Default' && item.size.trim() !== '') {
    details.push(`Size: ${item.size}`);
  }
  if (item.color && item.color !== 'N/A' && item.color !== 'Default' && item.color.trim() !== '') {
    details.push(`Color: ${item.color}`);
  }
  
  return details.length > 0 ? `<br><small style="color: #666;">${details.join(' | ')}</small>` : '';
}