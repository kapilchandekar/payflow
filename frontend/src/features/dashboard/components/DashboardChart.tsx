'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardChartProps {
  data: any[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  // If no data, use some dummy data for preview
  const chartData = data.length > 0 ? data : [
    { name: 'Mon', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Tue', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Wed', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Thu', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Fri', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Sat', total: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Sun', total: Math.floor(Math.random() * 5000) + 1000 },
  ];

  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up delay-200" style={{ opacity: 0, animationFillMode: 'forwards' }}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Weekly Spend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₹${value}`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                itemStyle={{ color: 'var(--foreground)' }}
                formatter={(value: any) => [`₹${value}`, 'Amount']}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
