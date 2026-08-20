'use client'

import { useEffect, useState, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, Utensils, Bed } from 'lucide-react'
import { formatINR, apiFetch } from '@/lib/format'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, LineChart, Line,
} from 'recharts'

type ChartsData = {
  revenueTrend: Array<{ date: string; label: string; hotel: number; food: number; total: number }>
  topItems: Array<{ name: string; quantity: number; revenue: number }>
  occupancyByDay: Array<{ date: string; occupied: number }>
  totalRooms: number
}

const COLORS = ['#B22222', '#8B0000', '#D4AF37', '#006400', '#4682B4', '#9932CC', '#FF8C00', '#2E8B57', '#DC143C', '#1E90FF']

export const DashboardCharts = memo(function DashboardCharts() {
  const [data, setData] = useState<ChartsData | null>(null)

  useEffect(() => {
    apiFetch<ChartsData>('/api/dashboard/charts?days=7').then(setData).catch(() => {})
  }, [])

  if (!data || data.revenueTrend.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading charts...
        </CardContent>
      </Card>
    )
  }

  // Check if all data is zero (fresh install with no invoices)
  const hasRevenueData = data.revenueTrend.some(d => d.total > 0)
  const hasItems = data.topItems.length > 0
  const hasOccupancy = data.occupancyByDay.some(d => d.occupied > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Revenue trend — 7 days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Revenue Trend (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.revenueTrend}>
                <defs>
                  <linearGradient id="hotelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B22222" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#B22222" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="foodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(value: any, name: any) => [formatINR(value), name === 'hotel' ? 'Hotel' : name === 'food' ? 'Food' : 'Total']}
                  labelStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="hotel" stackId="1" stroke="#B22222" fill="url(#hotelGrad)" />
                <Area type="monotone" dataKey="food" stackId="1" stroke="#D4AF37" fill="url(#foodGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No revenue data yet. Generate some invoices to see the trend." />
          )}
        </CardContent>
      </Card>

      {/* Occupancy trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bed className="h-4 w-4" /> Room Occupancy (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasOccupancy ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.occupancyByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, data.totalRooms]} />
                <Tooltip
                  labelFormatter={v => new Date(v as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  formatter={(value: any) => [`${value} of ${data.totalRooms} rooms`, 'Occupied']}
                />
                <Line type="monotone" dataKey="occupied" stroke="#B22222" strokeWidth={2} dot={{ r: 4, fill: '#B22222' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No occupancy data yet. Check in some guests to see the trend." />
          )}
        </CardContent>
      </Card>

      {/* Top selling items */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Top-Selling Items (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasItems ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topItems} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip
                  formatter={(value: any, name: any) => name === 'quantity' ? [`${value} sold`, 'Quantity'] : [formatINR(value), 'Revenue']}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                  {data.topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No food orders yet. Place some orders to see top items here." />
          )}
        </CardContent>
      </Card>
    </div>
  )
})

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-center text-xs text-muted-foreground px-4">
      {message}
    </div>
  )
}
