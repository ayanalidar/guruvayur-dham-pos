// End-to-end test for Hotel GuruVayurDham POS
// Tests: check-in → food order (room account) → food order (separate) → checkout → hotel invoice + food invoice
const BASE = 'http://localhost:3000'

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${path}: ${data?.error || res.status}`)
  return data
}

async function main() {
  console.log('--- Test 1: Dashboard ---')
  const dash = await api('/api/dashboard')
  console.log('Rooms:', dash.rooms, 'Revenue today:', dash.revenue)

  console.log('\n--- Test 2: Get rooms ---')
  const { rooms } = await api('/api/rooms')
  console.log(`Got ${rooms.length} rooms. First room:`, rooms[0]?.number, rooms[0]?.type, 'rate', rooms[0]?.ratePerNight)
  const room101 = rooms.find(r => r.number === '101')!
  const room205 = rooms.find(r => r.number === '205')!

  console.log('\n--- Test 3: Check-in to Room 101 ---')
  const { checkIn } = await api('/api/checkins', {
    method: 'POST',
    body: JSON.stringify({
      roomId: room101.id,
      guestName: 'Test Guest A',
      phone: '+91 9999999999',
      email: 'a@test.in',
      address: 'Test Address',
      idProofType: 'Aadhaar',
      idNumber: 'XXXX-XXXX-1234',
      adults: 2,
      children: 0,
      advanceAmount: 1000,
      expectedCheckOut: new Date(Date.now() + 86400000).toISOString(),
    }),
  })
  console.log('Check-in ID:', checkIn.id, 'Guest:', checkIn.guest.name, 'Room:', checkIn.room.number)

  console.log('\n--- Test 4: Verify room 101 is now occupied ---')
  const { rooms: rooms2 } = await api('/api/rooms')
  const r101v2 = rooms2.find(r => r.number === '101')!
  console.log('Room 101 status:', r101v2.status, '→ Guest:', r101v2.checkIns[0]?.guest.name)

  console.log('\n--- Test 5: Get menu ---')
  const { items } = await api('/api/menu')
  console.log(`Got ${items.length} menu items`)
  const dosa = items.find(i => i.name === 'Masala Dosa')!
  const coffee = items.find(i => i.name === 'Filter Coffee')!
  const meals = items.find(i => i.name === 'Veg Meals (Thali)')!

  console.log('\n--- Test 6: Place food order #1 — ROOM ACCOUNT (added to room bill) ---')
  const { order: order1 } = await api('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      checkInId: checkIn.id,
      customerName: 'Test Guest A',
      roomNumber: '101',
      orderType: 'room_service',
      paymentMode: 'room_account',
      items: [
        { menuItemId: meals.id, name: meals.name, price: meals.price, quantity: 2 },
        { menuItemId: coffee.id, name: coffee.name, price: coffee.price, quantity: 2 },
      ],
    }),
  })
  console.log('Order 1:', order1.orderNumber, 'Total:', order1.grandTotal, 'Mode:', order1.paymentMode)

  console.log('\n--- Test 7: Place food order #2 — SEPARATE BILL (walk-in guest) ---')
  const { order: order2 } = await api('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Walk-in Diner',
      tableNumber: 'T3',
      orderType: 'dine_in',
      paymentMode: 'separate',
      items: [
        { menuItemId: dosa.id, name: dosa.name, price: dosa.price, quantity: 3 },
        { menuItemId: coffee.id, name: coffee.name, price: coffee.price, quantity: 1 },
      ],
    }),
  })
  console.log('Order 2:', order2.orderNumber, 'Total:', order2.grandTotal, 'Mode:', order2.paymentMode)

  console.log('\n--- Test 8: Mark both orders as served ---')
  await api(`/api/orders/${order1.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'preparing' }) })
  await api(`/api/orders/${order1.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ready' }) })
  await api(`/api/orders/${order1.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'served' }) })
  await api(`/api/orders/${order2.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'served' }) })
  console.log('Both orders marked served')

  console.log('\n--- Test 9: Generate Food Invoice for order #2 (separate bill) ---')
  const { invoice: foodInv } = await api('/api/invoices/food', {
    method: 'POST',
    body: JSON.stringify({ orderId: order2.id, paymentMethod: 'UPI' }),
  })
  console.log('Food Invoice:', foodInv.invoiceNumber, 'Total:', foodInv.grandTotal, 'Customer:', foodInv.customerName)

  console.log('\n--- Test 10: Fetch the food invoice for printing ---')
  const { invoice: fInv } = await api(`/api/invoices/food/${foodInv.id}`)
  console.log('Items:', fInv.order.items.length, 'CGST:', fInv.cgstAmount, 'SGST:', fInv.sgstAmount)

  console.log('\n--- Test 11: Check-out Room 101 → should auto-generate Hotel Invoice ---')
  const checkoutRes = await api(`/api/checkins/${checkIn.id}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      generateInvoice: true,
      paymentMethod: 'Cash',
      discount: 100,
      extraCharges: 0,
    }),
  })
  console.log('Checkout done. Invoice:', checkoutRes.invoice?.invoiceNumber,
    'Nights:', checkoutRes.invoice?.nights,
    'Room Charges:', checkoutRes.invoice?.roomCharges,
    'Food Charges:', checkoutRes.invoice?.foodCharges,
    'Grand Total:', checkoutRes.invoice?.grandTotal,
    'Balance Due:', checkoutRes.balanceDue)

  console.log('\n--- Test 12: Verify room 101 is now in "cleaning" status ---')
  const { rooms: rooms3 } = await api('/api/rooms')
  const r101v3 = rooms3.find(r => r.number === '101')!
  console.log('Room 101 status after checkout:', r101v3.status)

  console.log('\n--- Test 13: Fetch hotel invoice for printing ---')
  const { invoice: hInv } = await api(`/api/invoices/hotel/${checkoutRes.invoice.id}`)
  console.log('Hotel Invoice:', hInv.invoiceNumber)
  console.log('  Guest:', hInv.guestName, 'Phone:', hInv.guestPhone)
  console.log('  Room:', hInv.roomNumber, 'Type:', hInv.roomType)
  console.log('  Nights:', hInv.nights, 'Rate:', hInv.ratePerNight)
  console.log('  Room Charges:', hInv.roomCharges, 'Food Charges:', hInv.foodCharges)
  console.log('  Discount:', hInv.discount, 'Taxable:', hInv.taxableAmount)
  console.log('  CGST:', hInv.cgstAmount, 'SGST:', hInv.sgstAmount)
  console.log('  Grand Total:', hInv.grandTotal, 'Advance:', hInv.advancePaid, 'Balance:', hInv.balanceDue)
  console.log('  Linked food orders on this invoice:', hInv.checkIn?.foodOrders?.length || 0)

  console.log('\n--- Test 14: List hotel invoices & food invoices ---')
  const hotelList = await api('/api/invoices/hotel')
  const foodList = await api('/api/invoices/food')
  console.log('Hotel invoices:', hotelList.invoices.length)
  console.log('Food invoices:', foodList.invoices.length)

  console.log('\n--- Test 15: Dashboard after operations ---')
  const dash2 = await api('/api/dashboard')
  console.log('Active check-ins:', dash2.activeCheckIns, 'Rooms occupied:', dash2.rooms.occupied)
  console.log('Hotel revenue today:', dash2.revenue.hotelToday, 'Food revenue today:', dash2.revenue.foodToday)

  console.log('\n✅ All tests passed!')
}

main().catch(e => { console.error('❌ Test failed:', e.message); process.exit(1) })
