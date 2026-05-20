import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  ShoppingCart,
  Users,
  XCircle,
  MapPin,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Globe,
  Lightbulb,
} from 'lucide-react';
import {
  fetchAnalyticsInsights,
  type AnalyticsInsights,
} from '../lib/analyticsInsightsService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPKR } from '../lib/pricing';
import { fetchAllOrdersForAnalytics, type AnalyticsOrder } from '../lib/analytics';
import { getSupabaseClient } from '../lib/supabase';
import cozipLogo from '../../../assets/bejeweled-web-logo.png';

type FilterPeriod = '7d' | '30d' | '3mo' | 'all';

const STATUS_COLORS: Record<string, string> = {
  Confirmed: '#5B1E6E',
  Processing: '#D97706',
  Packed: '#2563EB',
  Shipped: '#7C3AED',
  'In Transit': '#DC2626',
  'Out for Delivery': '#F97316',
  Delivered: '#059669',
  Cancelled: '#6B7280',
};
const PIE_FALLBACK = ['#5B1E6E', '#D97706', '#2563EB', '#7C3AED', '#DC2626', '#F97316', '#059669', '#6B7280'];

function TrendBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>vs prev period</span>;
  const up = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: up ? '#059669' : '#DC2626' }}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<AnalyticsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPeriod>('30d');
  const [productSort, setProductSort] = useState<'revenue' | 'qty'>('revenue');
  const [productNamesMap, setProductNamesMap] = useState<Map<string, string>>(new Map());
  const [pdfExporting, setPdfExporting] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    insights: string;
    trends: string;
    recommendations: string[];
    provider: 'groq' | 'huggingface' | 'static';
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [advInsights, setAdvInsights] = useState<AnalyticsInsights | null>(null);
  const [advInsightsLoading, setAdvInsightsLoading] = useState(false);
  const [advInsightsError, setAdvInsightsError] = useState<string | null>(null);

  const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

  // ── Advanced Insights handler ────────────────────────────────────────
  const loadAdvInsights = async () => {
    setAdvInsightsLoading(true);
    setAdvInsightsError(null);
    try {
      const productPerf = new Map<string, { name: string; category: string | null; revenue: number; ordersCount: number }>();
      for (const o of orders) {
        for (const item of o.items ?? []) {
          const name = productNamesMap.get(item.productId) ?? item.productId;
          const existing = productPerf.get(item.productId) ?? { name, category: null, revenue: 0, ordersCount: 0 };
          existing.revenue += item.price * item.quantity;
          existing.ordersCount += 1;
          productPerf.set(item.productId, existing);
        }
      }
      const result = await fetchAnalyticsInsights({
        orders: orders.map((o) => ({
          id: o.id,
          total: o.total,
          status: o.status,
          city: o.city,
          createdAt: o.createdAt,
          items: o.items,
        })),
        products: Array.from(productPerf.values()).map((p) => ({ id: '', ...p })),
      });
      setAdvInsights(result);
    } catch (err) {
      setAdvInsightsError((err as Error).message);
    } finally {
      setAdvInsightsLoading(false);
    }
  };

  useEffect(() => {
    const ordersP = fetchAllOrdersForAnalytics().then(setOrders).catch(console.error);
    const productsP = getSupabaseClient()
      .from('products')
      .select('id, name')
      .then(({ data }) => {
        const map = new Map<string, string>();
        for (const p of data ?? []) {
          if (p.id && p.name) map.set(p.id as string, p.name as string);
        }
        setProductNamesMap(map);
      })
      .catch(console.error);
    void Promise.all([ordersP, productsP]).finally(() => setLoading(false));
  }, []);

  // ── Time-windowed orders ─────────────────────────────────────────────
  const { filteredOrders, previousOrders } = useMemo(() => {
    const now = new Date();
    const days = filter === '7d' ? 7 : filter === '30d' ? 30 : filter === '3mo' ? 90 : Infinity;
    if (!isFinite(days)) return { filteredOrders: orders, previousOrders: [] as AnalyticsOrder[] };
    const cutoff = new Date(now.getTime() - days * 86_400_000);
    const prevCutoff = new Date(cutoff.getTime() - days * 86_400_000);
    return {
      filteredOrders: orders.filter((o) => new Date(o.createdAt) >= cutoff),
      previousOrders: orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= prevCutoff && d < cutoff;
      }),
    };
  }, [orders, filter]);

  // ── KPI metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + o.total, 0);
    const prevRevenue = previousOrders.reduce((s, o) => s + o.total, 0);
    const count = filteredOrders.length;
    const prevCount = previousOrders.length;
    const cancelled = filteredOrders.filter((o) => o.status === 'Cancelled').length;
    const cancelledRate = count > 0 ? (cancelled / count) * 100 : 0;
    const avg = count > 0 ? revenue / count : 0;
    const prevAvg = prevCount > 0 ? prevRevenue / prevCount : 0;
    return {
      revenue: Math.round(revenue),
      revenueGrowth: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      count,
      orderGrowth: prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : null,
      avg: Math.round(avg),
      avgGrowth: prevAvg > 0 ? ((avg - prevAvg) / prevAvg) * 100 : null,
      cancelled,
      cancelledRate,
    };
  }, [filteredOrders, previousOrders]);

  // ── Revenue trend ────────────────────────────────────────────────────
  const revenueTrend = useMemo(() => {
    const toKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (filter === '7d' || filter === '30d') return d.toISOString().split('T')[0];
      if (filter === '3mo') {
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const toLabel = (key: string) => {
      if (key.includes('W')) return `Wk ${key.split('W')[1]}`;
      const parts = key.split('-');
      if (parts.length === 2) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
      }
      return new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const map = new Map<string, { revenue: number; orders: number }>();

    if (filter !== 'all') {
      const days = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const key = toKey(new Date(now.getTime() - i * 86_400_000).toISOString());
        if (!map.has(key)) map.set(key, { revenue: 0, orders: 0 });
      }
    }

    for (const o of filteredOrders) {
      const key = toKey(o.createdAt);
      const existing = map.get(key) ?? { revenue: 0, orders: 0 };
      existing.revenue += o.total;
      existing.orders += 1;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ label: toLabel(key), revenue: Math.round(data.revenue), orders: data.orders }));
  }, [filteredOrders, filter]);

  // ── Last 6 months comparison ─────────────────────────────────────────
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      };
    });
    const map = new Map<string, number>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + o.total);
    }
    return months.map(({ key, label }) => ({ month: label, revenue: Math.round(map.get(key) ?? 0) }));
  }, [orders]);

  // ── Regional sales (top 8 cities) ────────────────────────────────────
  const regionalSales = useMemo(() => {
    const cityMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of filteredOrders) {
      const city = o.city?.trim() || 'Unknown';
      const ex = cityMap.get(city) ?? { revenue: 0, orders: 0 };
      ex.revenue += o.total;
      ex.orders += 1;
      cityMap.set(city, ex);
    }
    return Array.from(cityMap.entries())
      .map(([city, d]) => ({ city, revenue: Math.round(d.revenue), orders: d.orders }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredOrders]);

  // ── Order status breakdown ────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  // ── Product performance ────────────────────────────────────────────────
  const productPerformance = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; qty: number }>();
    for (const o of filteredOrders) {
      if (o.status === 'Cancelled') continue;
      for (const item of o.items) {
        const id = item.productId || item.name || 'unknown';
        // Resolve best available name: item.name → products table → fallback
        const resolvedName =
          item.name && item.name !== 'Unknown' && item.name.trim() !== ''
            ? item.name
            : productNamesMap.get(item.productId) ?? '';
        const ex = map.get(id) ?? { name: resolvedName, revenue: 0, qty: 0 };
        // Upgrade name in-place if a better one is available
        if (!ex.name || ex.name === 'Unknown' || ex.name.trim() === '') {
          ex.name = resolvedName || ex.name;
        }
        ex.qty += item.quantity;
        ex.revenue += item.price * item.quantity;
        map.set(id, ex);
      }
    }
    return Array.from(map.entries())
      .map(([id, d]) => ({
        id,
        // Final safety: try products table one more time before giving up
        name:
          d.name && d.name !== 'Unknown' && d.name.trim() !== ''
            ? d.name
            : productNamesMap.get(id) ?? 'Product',
        revenue: Math.round(d.revenue),
        qty: d.qty,
      }))
      .sort((a, b) => (productSort === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty))
      .slice(0, 10);
  }, [filteredOrders, productSort, productNamesMap]);

  // ── Customer insights ─────────────────────────────────────────────────
  const customerInsights = useMemo(() => {
    const countMap = new Map<string, number>();
    const revenueMap = new Map<string, { name: string; revenue: number }>();
    for (const o of filteredOrders) {
      countMap.set(o.email, (countMap.get(o.email) ?? 0) + 1);
      const ex = revenueMap.get(o.email) ?? { name: o.customerName, revenue: 0 };
      ex.revenue += o.total;
      revenueMap.set(o.email, ex);
    }
    const newCustomers = Array.from(countMap.values()).filter((c) => c === 1).length;
    const returning = Array.from(countMap.values()).filter((c) => c > 1).length;
    const topSpenders = Array.from(revenueMap.entries())
      .map(([email, d]) => ({ email, name: d.name, revenue: Math.round(d.revenue), orders: countMap.get(email) ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    return { newCustomers, returning, topSpenders };
  }, [filteredOrders]);

  // ── PDF export ────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setPdfExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Color palette
      const green: [number, number, number] = [122, 144, 112];
      const darkGreen: [number, number, number] = [74, 93, 69];
      const lightGreen: [number, number, number] = [240, 247, 239];
      const gray: [number, number, number] = [107, 114, 128];
      const lightGray: [number, number, number] = [249, 250, 251];
      const white: [number, number, number] = [255, 255, 255];

      // ── Page header helper ──────────────────────────────────────────
      const drawPageHeader = async (isFirst: boolean) => {
        doc.setFillColor(...green);
        doc.rect(0, 0, pageW, isFirst ? 38 : 14, 'F');
        if (isFirst) {
          // Try to embed logo
          try {
            const res = await fetch(cozipLogo);
            const blob = await res.blob();
            const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            doc.addImage(b64, 'PNG', margin, 6, 20, 20);
          } catch {
            // Logo unavailable — render text brand
            doc.setTextColor(...white);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('COZIP', margin, 20);
          }
          doc.setTextColor(...white);
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text('Analytics Report', margin + 26, 18);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const periodStr = `Period: ${filterLabels[filter]}  ·  Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
          doc.text(periodStr, margin + 26, 27);
          doc.text(`${filteredOrders.length} orders included`, margin + 26, 33);
        } else {
          doc.setTextColor(...white);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Bejeweled Analytics Report  ·  ${filterLabels[filter]}`, margin, 10);
        }
      };

      // ── Section title helper ────────────────────────────────────────
      const sectionTitle = (text: string, y: number): number => {
        doc.setFillColor(...lightGreen);
        doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
        doc.setTextColor(...darkGreen);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin + 3, y + 5);
        return y + 10;
      };

      // ── Footer helper ───────────────────────────────────────────────
      const addFooters = () => {
        const total = doc.getNumberOfPages();
        for (let p = 1; p <= total; p++) {
          doc.setPage(p);
          doc.setFillColor(...green);
          doc.rect(0, pageH - 9, pageW, 9, 'F');
          doc.setTextColor(...white);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text('Bejeweled Analytics Report  ·  Confidential', margin, pageH - 3);
          doc.text(`Page ${p} of ${total}`, pageW - margin, pageH - 3, { align: 'right' });
        }
      };

      await drawPageHeader(true);
      let y = 45;

      const tableOpts = {
        margin: { left: margin, right: margin },
        headStyles: { fillColor: green, textColor: white, fontStyle: 'bold' as const, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        styles: { cellPadding: 2.5 },
        tableWidth: pageW - 2 * margin,
      };

      // ── KPI SECTION ─────────────────────────────────────────────────
      y = sectionTitle('KEY PERFORMANCE INDICATORS', y);
      const kpis = [
        { label: 'Total Revenue', value: formatPKR(metrics.revenue) },
        { label: 'Total Orders', value: String(metrics.count) },
        { label: 'Avg Order Value', value: formatPKR(metrics.avg) },
        { label: 'Cancelled Orders', value: `${metrics.cancelled} (${metrics.cancelledRate.toFixed(1)}%)` },
      ];
      const kpiW = (pageW - 2 * margin - 9) / 4;
      kpis.forEach((kpi, i) => {
        const x = margin + i * (kpiW + 3);
        doc.setFillColor(...white);
        doc.setDrawColor(...green);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, y, kpiW, 18, 2, 2, 'FD');
        doc.setTextColor(...darkGreen);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(kpi.value, x + kpiW / 2, y + 9, { align: 'center', maxWidth: kpiW - 4 });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text(kpi.label, x + kpiW / 2, y + 15, { align: 'center' });
      });
      y += 25;

      // ── MONTHLY REVENUE ──────────────────────────────────────────────
      if (y + 50 > pageH - 15) { doc.addPage(); await drawPageHeader(false); y = 20; }
      y = sectionTitle('MONTHLY REVENUE — LAST 6 MONTHS', y);
      autoTable(doc, {
        ...tableOpts,
        startY: y,
        head: [['Month', 'Revenue (PKR)']],
        body: monthlyComparison.map(m => [m.month, formatPKR(m.revenue)]),
        columnStyles: { 1: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── TOP PRODUCTS ─────────────────────────────────────────────────
      if (y + 60 > pageH - 15) { doc.addPage(); await drawPageHeader(false); y = 20; }
      y = sectionTitle('TOP PRODUCTS', y);
      autoTable(doc, {
        ...tableOpts,
        startY: y,
        head: [['#', 'Product Name', 'Revenue (PKR)', 'Units Sold', 'Avg Price (PKR)']],
        body: productPerformance.slice(0, 10).map((p, i) => [
          String(i + 1),
          p.name,
          formatPKR(p.revenue),
          String(p.qty),
          p.qty > 0 ? formatPKR(Math.round(p.revenue / p.qty)) : '—',
        ]),
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── SALES BY CITY ─────────────────────────────────────────────────
      if (y + 50 > pageH - 15) { doc.addPage(); await drawPageHeader(false); y = 20; }
      y = sectionTitle('SALES BY CITY / REGION', y);
      autoTable(doc, {
        ...tableOpts,
        startY: y,
        head: [['#', 'City', 'Revenue (PKR)', 'Orders']],
        body: regionalSales.map((r, i) => [String(i + 1), r.city, formatPKR(r.revenue), String(r.orders)]),
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── ORDER STATUS ─────────────────────────────────────────────────
      if (y + 50 > pageH - 15) { doc.addPage(); await drawPageHeader(false); y = 20; }
      y = sectionTitle('ORDER STATUS BREAKDOWN', y);
      autoTable(doc, {
        ...tableOpts,
        startY: y,
        head: [['Status', 'Count', 'Percentage']],
        body: statusBreakdown.map(s => [
          s.status,
          String(s.count),
          metrics.count > 0 ? `${((s.count / metrics.count) * 100).toFixed(1)}%` : '0%',
        ]),
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ── CUSTOMER INSIGHTS ────────────────────────────────────────────
      if (y + 65 > pageH - 15) { doc.addPage(); await drawPageHeader(false); y = 20; }
      y = sectionTitle('CUSTOMER INSIGHTS', y);

      // Customer split boxes
      const splitItems = [
        { label: 'New Customers', value: String(customerInsights.newCustomers) },
        { label: 'Returning Customers', value: String(customerInsights.returning) },
        {
          label: 'Repeat Purchase Rate',
          value:
            customerInsights.newCustomers + customerInsights.returning > 0
              ? `${((customerInsights.returning / (customerInsights.newCustomers + customerInsights.returning)) * 100).toFixed(1)}%`
              : '0%',
        },
      ];
      const splitW = (pageW - 2 * margin - 6) / 3;
      splitItems.forEach((item, i) => {
        const x = margin + i * (splitW + 3);
        doc.setFillColor(...white);
        doc.setDrawColor(...green);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, y, splitW, 16, 2, 2, 'FD');
        doc.setTextColor(...darkGreen);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x + splitW / 2, y + 8, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.text(item.label, x + splitW / 2, y + 13.5, { align: 'center' });
      });
      y += 22;

      // Top spenders table
      autoTable(doc, {
        ...tableOpts,
        startY: y,
        head: [['#', 'Customer', 'Email', 'Revenue (PKR)', 'Orders']],
        body: customerInsights.topSpenders.map((c, i) => [
          String(i + 1),
          c.name || 'Customer',
          c.email,
          formatPKR(c.revenue),
          String(c.orders),
        ]),
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      });

      addFooters();
      doc.save(`bejeweled-analytics-${filter}-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setPdfExporting(false);
    }
  };

  // ── AI Insights ───────────────────────────────────────────────────────
  const getAIInsights = async () => {
    setAiLoading(true);
    setAiInsights(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter,
          metrics,
          topProducts: productPerformance.slice(0, 5).map((p) => ({ name: p.name, revenue: p.revenue, qty: p.qty })),
          topCities: regionalSales.slice(0, 5).map((r) => ({ city: r.city, revenue: r.revenue, orders: r.orders })),
          statusBreakdown,
          monthlyRevenue: monthlyComparison.map((m) => ({ month: m.month, revenue: m.revenue })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as typeof aiInsights;
      setAiInsights(data);
      setInsightsOpen(true);
    } catch (err) {
      console.error('[AdminAnalytics] AI insights error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const filterLabels: Record<FilterPeriod, string> = {
    '7d': 'last 7 days',
    '30d': 'last 30 days',
    '3mo': 'last 3 months',
    all: 'all time',
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse" style={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
        <div className="flex items-center justify-between">
          <div className="h-7 w-48" style={{ backgroundColor: '#E8D5F5' }} />
          <div className="flex gap-3">
            <div className="h-9 w-64" style={{ backgroundColor: '#E8D5F5' }} />
            <div className="h-9 w-28" style={{ backgroundColor: '#E8D5F5' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[0,1,2,3,4].map((n) => (
            <div key={n} className="h-28" style={{ backgroundColor: '#F3EEF8' }} />
          ))}
        </div>
        <div className="grid xl:grid-cols-[2fr_1fr] gap-6">
          <div className="h-72" style={{ backgroundColor: '#F3EEF8' }} />
          <div className="h-72" style={{ backgroundColor: '#F3EEF8' }} />
        </div>
      </div>
    );
  }

  // ── Luxury palette ────────────────────────────────────────────────────
  const A = {
    bg:          '#FAFAFA',
    surface:     '#FFFFFF',
    surfaceHigh: '#FAF7FF',
    gold:        '#C9A84C',
    border:      '#E8D5F5',
    ivory:       '#1A0A24',
    ivoryMuted:  '#6B4F7A',
    textMuted:   '#9B8FAA',
  } as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" style={{ backgroundColor: A.bg, minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', margin: 0, lineHeight: 1.2 }}>
            Analytics Dashboard
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.8rem', marginTop: '4px' }}>
            {filteredOrders.length} orders · {filterLabels[filter]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period filter */}
          <div className="flex overflow-hidden" style={{ border: `1px solid ${A.border}` }}>
            {(['7d', '30d', '3mo', 'all'] as FilterPeriod[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: filter === f ? 600 : 400,
                  backgroundColor: filter === f ? A.gold : 'transparent',
                  color: filter === f ? A.bg : A.ivoryMuted,
                  padding: '8px 16px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  borderTop: 'none',
                  borderBottom: 'none',
                  borderLeft: 'none',
                  borderRight: f !== 'all' ? `1px solid ${A.border}` : 'none',
                  letterSpacing: '0.04em',
                }}
              >
                {f === '3mo' ? '3 Mo' : f === 'all' ? 'All' : f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => { void exportPDF(); }}
            disabled={pdfExporting}
            className="flex items-center gap-2"
            style={{
              backgroundColor: 'transparent',
              color: A.ivoryMuted,
              border: `1px solid ${A.border}`,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '0.8125rem',
              padding: '8px 16px',
              cursor: pdfExporting ? 'wait' : 'pointer',
              opacity: pdfExporting ? 0.5 : 1,
              letterSpacing: '0.04em',
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {pdfExporting ? 'Generating…' : 'Export PDF'}
          </button>
          <button
            onClick={() => { void getAIInsights(); }}
            disabled={aiLoading}
            className="flex items-center gap-2"
            style={{
              backgroundColor: A.gold,
              color: A.bg,
              border: 'none',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '0.8125rem',
              padding: '8px 16px',
              cursor: aiLoading ? 'wait' : 'pointer',
              opacity: aiLoading ? 0.6 : 1,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiLoading ? 'Analysing…' : 'AI Insights'}
          </button>
        </div>
      </div>

      {/* ── AI Insights Panel ─────────────────────────────────────────── */}
      {aiInsights && (
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4"
            onClick={() => setInsightsOpen((v) => !v)}
            style={{ backgroundColor: A.surfaceHigh, border: 'none', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: A.gold }} />
              <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem' }}>
                AI Performance Insights
              </span>
              <span style={{
                backgroundColor: aiInsights.provider === 'groq' ? '#DCFCE7' : aiInsights.provider === 'huggingface' ? '#FEF3C7' : A.surfaceHigh,
                color: aiInsights.provider === 'groq' ? '#166534' : aiInsights.provider === 'huggingface' ? '#92400E' : A.ivoryMuted,
                fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.72rem', padding: '2px 8px', letterSpacing: '0.04em',
              }}>
                {aiInsights.provider === 'groq' ? 'Groq AI' : aiInsights.provider === 'huggingface' ? 'HuggingFace AI' : 'Fallback'}
              </span>
            </div>
            {insightsOpen ? <ChevronUp className="h-4 w-4" style={{ color: A.gold }} /> : <ChevronDown className="h-4 w-4" style={{ color: A.gold }} />}
          </button>
          {insightsOpen && (
            <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ borderTop: `1px solid ${A.border}` }}>
              <div className="lg:col-span-1">
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>Summary</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{aiInsights.insights}</p>
                {aiInsights.trends && (
                  <>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>Trends</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{aiInsights.trends}</p>
                  </>
                )}
              </div>
              <div className="lg:col-span-2">
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', marginTop: 0 }}>Recommendations</p>
                <ul className="space-y-2">
                  {aiInsights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span style={{ backgroundColor: A.gold, color: A.bg, fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.72rem', height: '18px', width: '18px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>{i + 1}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', lineHeight: 1.6 }}>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Stats: 5 cards ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 xl:grid-cols-5 gap-3" aria-label="Key performance indicators">
        <article style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <TrendingUp className="h-4 w-4" style={{ color: A.gold }} />
            <TrendBadge value={metrics.revenueGrowth} />
          </div>
          <p style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 4px', lineHeight: 1 }}>{formatPKR(metrics.revenue)}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.04em', margin: 0 }}>Total Revenue</p>
        </article>
        <article style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <ShoppingCart className="h-4 w-4" style={{ color: A.gold }} />
            <TrendBadge value={metrics.orderGrowth} />
          </div>
          <p style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 4px', lineHeight: 1 }}>{metrics.count}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.04em', margin: 0 }}>Total Orders</p>
        </article>
        <article style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <Package className="h-4 w-4" style={{ color: A.gold }} />
            <TrendBadge value={metrics.avgGrowth} />
          </div>
          <p style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 4px', lineHeight: 1 }}>{formatPKR(metrics.avg)}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.04em', margin: 0 }}>Avg Order Value</p>
        </article>
        <article style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <XCircle className="h-4 w-4" style={{ color: metrics.cancelledRate > 10 ? '#C0392B' : A.textMuted }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: metrics.cancelledRate > 10 ? '#C0392B' : A.textMuted }}>{metrics.cancelledRate.toFixed(1)}%</span>
          </div>
          <p style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 4px', lineHeight: 1 }}>{metrics.cancelled}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.04em', margin: 0 }}>Cancelled Orders</p>
        </article>
        <article style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '20px' }}>
          <div className="flex items-start justify-between mb-3">
            <Users className="h-4 w-4" style={{ color: A.gold }} />
          </div>
          <p style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 4px', lineHeight: 1 }}>
            {customerInsights.newCustomers + customerInsights.returning > 0
              ? `${((customerInsights.returning / (customerInsights.newCustomers + customerInsights.returning)) * 100).toFixed(0)}%`
              : '—'}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', letterSpacing: '0.04em', margin: 0 }}>Repeat Purchase Rate</p>
        </article>
      </section>

      {/* ── Revenue Trend (2/3) + Monthly Revenue (1/3) ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}` }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>Revenue Trend</h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>
              {filter === '7d' ? 'Daily — last 7 days' : filter === '30d' ? 'Daily — last 30 days' : filter === '3mo' ? 'Weekly — last 3 months' : 'Monthly — all time'}
            </p>
          </div>
          <div className="h-64 px-2 py-4">
            {revenueTrend.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.875rem' }}>No data for this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C8A24A" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#C8A24A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={A.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: A.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: A.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: A.surfaceHigh, border: `1px solid ${A.border}` }}
                    labelStyle={{ color: A.ivory, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                    itemStyle={{ color: A.gold, fontFamily: 'Inter, sans-serif' }}
                    formatter={(v: number) => [formatPKR(v), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={A.gold} strokeWidth={2} fill="url(#rGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}` }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>Monthly Revenue</h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>Last 6 calendar months</p>
          </div>
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={A.border} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: A.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: A.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: A.surfaceHigh, border: `1px solid ${A.border}` }}
                  labelStyle={{ color: A.ivory, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                  itemStyle={{ color: A.gold, fontFamily: 'Inter, sans-serif' }}
                  formatter={(v: number) => [formatPKR(v), 'Revenue']}
                />
                <Bar dataKey="revenue" fill={A.gold} radius={[2, 2, 0, 0]} barSize={22} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* ── Sales by City (1/3) + Order Status (2/3) ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-5">
        {/* Sales by City — narrow */}
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}` }}>
            <h3 className="flex items-center gap-1.5" style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>
              <MapPin className="h-3.5 w-3.5" style={{ color: A.gold }} />
              Sales by City
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>Revenue distribution by delivery city</p>
          </div>
          {regionalSales.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.875rem' }}>No data</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {regionalSales.slice(0, 8).map((r, i) => (
                <div
                  key={r.city}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: i < regionalSales.slice(0, 8).length - 1 ? `1px solid ${A.border}` : 'none' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.72rem', fontWeight: 700, width: '18px', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.city}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>{formatPKR(r.revenue)}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.7rem', margin: 0 }}>{r.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Status — wider */}
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}` }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>Order Status</h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>Breakdown for selected period</p>
          </div>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.875rem' }}>No data</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div style={{ padding: '16px 8px' }}>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius="38%" outerRadius="70%" paddingAngle={2}>
                        {statusBreakdown.map((entry, i) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: A.surfaceHigh, border: `1px solid ${A.border}` }}
                        labelStyle={{ color: A.ivory, fontFamily: 'Inter, sans-serif' }}
                        itemStyle={{ color: A.ivoryMuted, fontFamily: 'Inter, sans-serif' }}
                        formatter={(v: number, name: string) => [v, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                {statusBreakdown.map((entry, i) => (
                  <div key={entry.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ height: '8px', width: '8px', flexShrink: 0, backgroundColor: STATUS_COLORS[entry.status] ?? PIE_FALLBACK[i % PIE_FALLBACK.length] }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.status}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.8125rem', fontWeight: 600 }}>{entry.count}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.75rem', width: '38px', textAlign: 'right' }}>
                        {metrics.count > 0 ? `${((entry.count / metrics.count) * 100).toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Products ──────────────────────────────────────────────── */}
      <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="flex items-center gap-1.5" style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>
              <Award className="h-3.5 w-3.5" style={{ color: A.gold }} />
              Top Products
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>Ranked by performance · excludes cancelled orders</p>
          </div>
          <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${A.border}` }}>
            {(['revenue', 'qty'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setProductSort(s)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: productSort === s ? 600 : 400,
                  backgroundColor: productSort === s ? A.gold : 'transparent',
                  color: productSort === s ? A.bg : A.ivoryMuted,
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  borderTop: 'none',
                  borderBottom: 'none',
                  borderLeft: 'none',
                  borderRight: s === 'revenue' ? `1px solid ${A.border}` : 'none',
                }}
              >
                {s === 'revenue' ? 'By Revenue' : 'By Quantity'}
              </button>
            ))}
          </div>
        </div>
        {productPerformance.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.875rem' }}>No product data for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 90px 110px', padding: '10px 20px', borderBottom: `1px solid ${A.border}`, backgroundColor: A.surfaceHigh, minWidth: '560px' }}>
              {['#', 'Product', 'Revenue', 'Units', 'Avg Price'].map((col, idx) => (
                <span key={col} style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, textAlign: idx > 1 ? 'right' : 'left' }}>{col}</span>
              ))}
            </div>
            {productPerformance.map((p, i) => (
              <div
                key={p.id}
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 90px 110px', padding: '13px 20px', borderBottom: i < productPerformance.length - 1 ? `1px solid ${A.border}` : 'none', minWidth: '560px' }}
              >
                <span style={{ fontFamily: 'Inter, sans-serif', color: i < 3 ? A.gold : A.textMuted, fontSize: '0.8125rem', fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '16px' }}>{p.name}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.875rem', fontWeight: 600, textAlign: 'right' }}>{formatPKR(p.revenue)}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', textAlign: 'right' }}>{p.qty}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.8125rem', textAlign: 'right' }}>{p.qty > 0 ? formatPKR(Math.round(p.revenue / p.qty)) : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Customer Insights: 50/50 ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Customer Split */}
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, padding: '24px' }}>
          <h3 className="flex items-center gap-1.5" style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 20px' }}>
            <Users className="h-3.5 w-3.5" style={{ color: A.gold }} />
            Customer Split
          </h3>
          <div className="space-y-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `1px solid ${A.border}` }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.875rem', fontWeight: 500, margin: '0 0 3px' }}>New Customers</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.75rem', margin: 0 }}>First purchase in period</p>
              </div>
              <span style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 700, fontSize: '1.75rem' }}>{customerInsights.newCustomers}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `1px solid ${A.border}` }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.875rem', fontWeight: 500, margin: '0 0 3px' }}>Returning</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.75rem', margin: 0 }}>Multiple orders in period</p>
              </div>
              <span style={{ fontFamily: 'Playfair Display, serif', color: A.gold, fontWeight: 700, fontSize: '1.75rem' }}>{customerInsights.returning}</span>
            </div>
            {customerInsights.newCustomers + customerInsights.returning > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem' }}>Repeat purchase rate</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.75rem', fontWeight: 600 }}>
                    {((customerInsights.returning / (customerInsights.newCustomers + customerInsights.returning)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '3px', backgroundColor: A.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: A.gold, width: `${(customerInsights.returning / (customerInsights.newCustomers + customerInsights.returning)) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Spenders */}
        <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${A.border}` }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: '0 0 3px' }}>Top Spenders</h3>
            <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.75rem', margin: 0 }}>Highest revenue customers for the selected period</p>
          </div>
          {customerInsights.topSpenders.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.875rem' }}>No data</p>
            </div>
          ) : (
            <div>
              {customerInsights.topSpenders.map((c, i) => (
                <div
                  key={c.email}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: i < customerInsights.topSpenders.length - 1 ? `1px solid ${A.border}` : 'none' }}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', color: i < 3 ? A.gold : A.textMuted, fontSize: '0.8125rem', fontWeight: i < 3 ? 700 : 400, width: '20px', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 500, fontSize: '0.875rem', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Customer'}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.75rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontWeight: 600, fontSize: '0.875rem', margin: '0 0 2px' }}>{formatPKR(c.revenue)}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.75rem', margin: 0 }}>{c.orders} {c.orders === 1 ? 'order' : 'orders'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ADVANCED INSIGHTS ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: A.surface, border: `1px solid ${A.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: advInsights ? `1px solid ${A.border}` : 'none' }}>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" style={{ color: A.gold }} />
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: A.ivory, fontWeight: 600, fontSize: '1rem', margin: 0 }}>Advanced Insights</h3>
            <span style={{ backgroundColor: A.surfaceHigh, color: A.gold, fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', padding: '2px 8px', letterSpacing: '0.06em' }}>AI Powered</span>
          </div>
          {!advInsights ? (
            <button
              onClick={() => { void loadAdvInsights(); }}
              disabled={advInsightsLoading || loading}
              className="flex items-center gap-2"
              style={{ backgroundColor: A.gold, color: A.bg, border: 'none', padding: '8px 16px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: advInsightsLoading ? 'wait' : 'pointer', opacity: advInsightsLoading || loading ? 0.5 : 1 }}
            >
              {advInsightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {advInsightsLoading ? 'Analysing…' : 'Generate Advanced Insights'}
            </button>
          ) : (
            <button
              onClick={() => { void loadAdvInsights(); }}
              disabled={advInsightsLoading}
              style={{ background: 'none', border: 'none', fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {advInsightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : '↺ Refresh'}
            </button>
          )}
        </div>

        {advInsightsError && (
          <div style={{ padding: '16px 20px', fontFamily: 'Inter, sans-serif', color: '#C0392B', fontSize: '0.875rem' }}>{advInsightsError}</div>
        )}

        {advInsights && (
          <div className="p-5 space-y-6">
            <div className="flex gap-2 items-center" style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.8rem' }}>
              <span>Provider:</span>
              <span style={{ backgroundColor: A.surfaceHigh, color: A.gold, padding: '2px 8px', fontSize: '0.72rem', letterSpacing: '0.04em' }}>{advInsights.provider}</span>
            </div>
            <div>
              <h4 style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px', marginTop: 0 }}>
                <Globe className="inline h-3.5 w-3.5 mr-1.5" style={{ color: A.gold }} />
                Seasonal Sales
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {advInsights.seasonal.map((s) => (
                  <div key={s.season} style={{ backgroundColor: A.surfaceHigh, border: `1px solid ${A.border}`, padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.72rem', marginBottom: '6px', marginTop: 0 }}>{s.season}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem', margin: '0 0 2px' }}>PKR {s.revenue.toLocaleString()}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.75rem', margin: 0 }}>{s.orders} orders</p>
                  </div>
                ))}
              </div>
            </div>

            {advInsights.areaWise.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px', marginTop: 0 }}>
                  <MapPin className="inline h-3.5 w-3.5 mr-1.5" style={{ color: A.gold }} />
                  Top Cities by Revenue
                </h4>
                <div style={{ border: `1px solid ${A.border}`, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px', padding: '10px 16px', backgroundColor: A.surfaceHigh, borderBottom: `1px solid ${A.border}` }}>
                    {['City', 'Revenue', 'Orders'].map((h, idx) => (
                      <span key={h} style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: idx > 0 ? 'right' : 'left' }}>{h}</span>
                    ))}
                  </div>
                  {advInsights.areaWise.map((a, i) => (
                    <div key={a.city} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px', padding: '10px 16px', borderBottom: i < advInsights.areaWise.length - 1 ? `1px solid ${A.border}` : 'none' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontSize: '0.875rem' }}>{a.city}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontWeight: 500, fontSize: '0.875rem', textAlign: 'right' }}>PKR {a.revenue.toLocaleString()}</span>
                      <span style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', textAlign: 'right' }}>{a.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px', marginTop: 0 }}>
                <Lightbulb className="inline h-3.5 w-3.5 mr-1.5" style={{ color: A.gold }} />
                Product Recommendations
              </h4>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Stock Up', items: advInsights.recommendations.stockIncrease, accent: '#1A3B2A', text: '#34D399' },
                  { label: 'Low Performers', items: advInsights.recommendations.lowPerforming, accent: '#3B1A1A', text: '#F87171' },
                  { label: 'Trending', items: advInsights.recommendations.trending, accent: '#2B1A0D', text: A.gold },
                ].map(({ label, items, accent, text }) => (
                  <div key={label} style={{ backgroundColor: accent, border: `1px solid ${A.border}`, padding: '16px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: text, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>{label}</p>
                    {items.length === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', color: A.textMuted, fontSize: '0.8125rem' }}>No data</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {items.map((item) => <li key={item} style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.8125rem' }}>· {item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {advInsights.recommendations.aiSummary && (
              <div style={{ backgroundColor: A.surfaceHigh, border: `1px solid ${A.border}`, padding: '16px' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>
                  <Sparkles className="inline h-3.5 w-3.5 mr-1" />
                  AI Summary
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{advInsights.recommendations.aiSummary}</p>
                {advInsights.recommendations.aiActions.length > 0 && (
                  <ul style={{ marginTop: '12px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {advInsights.recommendations.aiActions.map((a) => (
                      <li key={a} style={{ fontFamily: 'Inter, sans-serif', color: A.gold, fontSize: '0.8rem' }}>→ {a}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {advInsights.blogTopicSuggestions.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'Inter, sans-serif', color: A.ivory, fontWeight: 600, fontSize: '0.875rem', marginBottom: '10px', marginTop: 0 }}>Suggested Blog Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {advInsights.blogTopicSuggestions.map((t) => (
                    <span key={t} style={{ fontFamily: 'Inter, sans-serif', color: A.ivoryMuted, fontSize: '0.78rem', padding: '4px 12px', border: `1px solid ${A.border}`, backgroundColor: A.surfaceHigh }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
