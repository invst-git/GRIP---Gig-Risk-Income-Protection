export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value) {
  return `Rs ${Number(value).toLocaleString('en-IN')}`
}

export function formatSignedCurrency(value) {
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${formatCurrency(Math.abs(value))}`
}
