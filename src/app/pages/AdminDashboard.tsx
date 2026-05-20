import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Package, ShoppingCart, Users, LayoutDashboard, Plus, Edit2, Trash2, Tag, BarChart3, Mail, TrendingUp, Calendar, ChevronLeft, ChevronRight, UserPlus, UserCheck, Clock3, Sparkles, ArrowUpRight, Menu, X, Star, MessageSquare, Reply, Inbox, Eye, Bot, Loader2, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { useProducts } from '../hooks/useProducts';
import { deleteProductById, deleteProductImages, getProductById, updateProduct, uploadProductImages } from '../lib/products';
import cozipLogo from '../../../assets/bejeweled-web-logo.png';
import { showErrorToast, showSuccessToast } from '../lib/notifications';
import { formatPKR } from '../lib/pricing';
import { PageSeo } from '../components/PageSeo';
import { fetchAllOrders, fetchAllCustomers, updateOrderStatus, type AdminOrder, type AdminCustomer } from '../lib/admin';
import type { OrderStatus } from '../types';
import { fetchCoupons, createCoupon, deleteCoupon, updateCouponStatus, type Coupon } from '../lib/coupons';
import { getAllReviewsForAdmin, replyToReview, deleteReview, type Review } from '../lib/reviews';
import { getDashboardMetrics, getTopProducts, type DashboardMetrics, type TopProduct } from '../lib/analytics';
import { fetchContactMessages, markMessageAsRead, deleteContactMessage, type ContactMessage } from '../lib/contactMessages';
import { fetchChatLogs, deleteChatLog, type ChatLog } from '../lib/chatAnalytics';
import { signOut } from '../lib/auth';
import AdminAnalytics from './AdminAnalytics';
import AdminSeo from './AdminSeo';
import AdminBlog from './AdminBlog';

interface Customer {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  role: string;
  createdAt: string;
}

interface EditProductFormState {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  care: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  isFeatured: boolean;
  images: string[];
}

type EditableImage = {
  id: string;
  kind: 'existing' | 'new';
  preview: string;
  originalUrl?: string;
  file?: File;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveViewState] = useState<'overview' | 'products' | 'orders' | 'customers' | 'coupons' | 'analytics' | 'seo' | 'reviews' | 'inquiries' | 'chatai' | 'blog'>(() => {
    // Restore the last active view from localStorage so refresh stays on the same page
    try {
      const saved = localStorage.getItem('admin-active-view');
      const valid = ['overview', 'products', 'orders', 'customers', 'coupons', 'analytics', 'seo', 'reviews', 'inquiries', 'chatai', 'blog'] as const;
      if (saved && (valid as readonly string[]).includes(saved)) return saved as typeof valid[number];
    } catch { /* ignore storage errors */ }
    return 'overview'; // Default to Overview instead of Orders
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Wrapper that also persists the active view to localStorage
  const setActiveView = (view: typeof activeView) => {
    setActiveViewState(view);
    try { localStorage.setItem('admin-active-view', view); } catch { /* ignore */ }
  };
  const { data: products, error: productsError, loading: productsLoading, refetch: refetchProducts } = useProducts();
  const [editProduct, setEditProduct] = useState<EditProductFormState | null>(null);
  const [editImages, setEditImages] = useState<EditableImage[]>([]);
  const [originalEditImages, setOriginalEditImages] = useState<string[]>([]);
  const [productSeoAiLoading, setProductSeoAiLoading] = useState(false);
  const [isProductActionPending, setIsProductActionPending] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productActionError, setProductActionError] = useState<string | null>(null);
  const [productActionMessage, setProductActionMessage] = useState<string | null>(null);

  // Real data state
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customerRecords, setCustomerRecords] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Analytics state
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  // Chat AI state
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [chatAiLoading, setChatAiLoading] = useState(false);
  const [selectedChatLog, setSelectedChatLog] = useState<ChatLog | null>(null);
  const [chatLogSearch, setChatLogSearch] = useState('');

  // ─── Add Coupon Modal state ───────────────────────────────────────────────
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  // ─── Coupon Detail Modal state ────────────────────────────────────────────
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [couponStatusConfirm, setCouponStatusConfirm] = useState<{ coupon: Coupon; newStatus: 'Active' | 'Expired' } | null>(null);
  const [couponStatusPending, setCouponStatusPending] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [couponDiscountValue, setCouponDiscountValue] = useState('');
  const [couponUsageLimit, setCouponUsageLimit] = useState('');
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const couponCodeRef = useRef<HTMLInputElement>(null);

  function resetCouponForm() {
    setCouponCode('');
    setCouponDiscountType('percent');
    setCouponDiscountValue('');
    setCouponUsageLimit('');
    setCouponErrors({});
  }

  function validateCouponForm(): boolean {
    const errs: Record<string, string> = {};
    const codeClean = couponCode.trim().toUpperCase();
    if (!codeClean) {
      errs.code = 'Coupon code is required.';
    } else if (!/^[A-Z0-9]+$/.test(codeClean)) {
      errs.code = 'Only capital letters and numbers are allowed — no spaces or special characters.';
    }
    const val = Number(couponDiscountValue);
    if (!couponDiscountValue) {
      errs.value = 'Discount value is required.';
    } else if (isNaN(val) || val <= 0) {
      errs.value = 'Enter a positive number.';
    } else if (couponDiscountType === 'percent' && val > 100) {
      errs.value = 'Percentage cannot exceed 100.';
    }
    const lim = Number(couponUsageLimit);
    if (!couponUsageLimit) {
      errs.limit = 'Usage limit is required.';
    } else if (!Number.isInteger(lim) || lim <= 0) {
      errs.limit = 'Enter a whole positive number.';
    }
    setCouponErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreateCoupon() {
    if (!validateCouponForm()) return;
    setCouponSubmitting(true);
    try {
      const codeClean = couponCode.trim().toUpperCase();
      // Check for duplicates against in-memory list (fast check)
      if (coupons.some(c => c.code === codeClean)) {
        setCouponErrors({ code: `Coupon "${codeClean}" already exists.` });
        return;
      }
      await createCoupon({
        code: codeClean,
        discountType: couponDiscountType,
        discountValue: Number(couponDiscountValue),
        usageLimit: Number(couponUsageLimit),
        status: 'Active',
      });
      // Refresh coupons list from DB to get the real id & timestamps
      const refreshed = await fetchCoupons();
      setCoupons(refreshed);
      showSuccessToast('Coupon created', `"${codeClean}" is now active.`);
      setShowAddCouponModal(false);
      resetCouponForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create coupon.';
      // Handle unique-constraint violation from DB
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setCouponErrors({ code: 'A coupon with this code already exists.' });
      } else {
        showErrorToast('Error', msg);
      }
    } finally {
      setCouponSubmitting(false);
    }
  }

  // Fetch real data on mount
  useEffect(() => {
    async function loadAdminData() {
      try {
        const [fetchedOrders, fetchedCustomers, fetchedCoupons, fetchedMessages] = await Promise.all([
          fetchAllOrders(),
          fetchAllCustomers(),
          fetchCoupons(),
          fetchContactMessages(),
        ]);
        setOrders(fetchedOrders);
        setContactMessages(fetchedMessages);
        setCustomerRecords(fetchedCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          totalSpent: c.totalSpent,
          orderCount: c.orderCount,
          role: c.role,
          createdAt: c.createdAt,
        })));
        setCoupons(fetchedCoupons);

        // ── Debug: revenue validation ────────────────────────────────
        const now = new Date();
        const cm = now.getMonth();
        const cy = now.getFullYear();
        const pm = cm === 0 ? 11 : cm - 1;
        const py = cm === 0 ? cy - 1 : cy;
        const thisMonthOrders = fetchedOrders.filter(o => {
          const d = new Date(o.date);
          return d.getMonth() === cm && d.getFullYear() === cy;
        });
        const prevMonthOrders = fetchedOrders.filter(o => {
          const d = new Date(o.date);
          return d.getMonth() === pm && d.getFullYear() === py;
        });
        const cancelledOrders = fetchedOrders.filter(o => o.status === 'Cancelled');
        console.group('[AdminDashboard] Revenue Debug');
        console.log('All-time orders:', fetchedOrders.length);
        console.log('All-time revenue (PKR):', fetchedOrders.reduce((s, o) => s + o.total, 0));
        console.log('Current month orders:', thisMonthOrders.length);
        console.log('Current month revenue (PKR):', thisMonthOrders.reduce((s, o) => s + o.total, 0));
        console.log('Prev month orders:', prevMonthOrders.length);
        console.log('Prev month revenue (PKR):', prevMonthOrders.reduce((s, o) => s + o.total, 0));
        console.log('Cancelled orders:', cancelledOrders.length);
        console.groupEnd();
        // ────────────────────────────────────────────────────────────
      } catch (err) {
        showErrorToast('Admin data', err instanceof Error ? err.message : 'Failed to load dashboard data.');
      } finally {
        setDataLoading(false);
      }
    }
    void loadAdminData();
  }, []);

  // Load analytics when analytics tab is opened
  useEffect(() => {
    if (activeView !== 'analytics') return;
    setAnalyticsLoading(true);
    void Promise.all([getDashboardMetrics(), getTopProducts(5)])
      .then(([metrics, products]) => {
        setDashboardMetrics(metrics);
        setTopProducts(products);
      })
      .catch((err) => {
        showErrorToast('Analytics', err instanceof Error ? err.message : 'Failed to load analytics.');
      })
      .finally(() => setAnalyticsLoading(false));
  }, [activeView]);

  // Load reviews when reviews tab is opened
  useEffect(() => {
    if (activeView !== 'reviews') return;
    setReviewsLoading(true);
    void getAllReviewsForAdmin().then(setAllReviews).catch((err) => {
      showErrorToast('Reviews', err instanceof Error ? err.message : 'Failed to load reviews.');
    }).finally(() => setReviewsLoading(false));
  }, [activeView]);

  // Load chat logs when chatai tab is opened
  useEffect(() => {
    if (activeView !== 'chatai') return;
    setChatAiLoading(true);
    void fetchChatLogs(200)
      .then(setChatLogs)
      .catch((err) => {
        showErrorToast('Chat Logs', err instanceof Error ? err.message : 'Failed to load chat logs.');
      })
      .finally(() => setChatAiLoading(false));
  }, [activeView]);

  async function handleSaveReply(reviewId: string) {
    if (!replyText.trim()) return;
    try {
      await replyToReview(reviewId, replyText.trim());
      setAllReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, admin_reply: replyText.trim(), replied_at: new Date().toISOString() } : r));
      setReplyingToId(null);
      setReplyText('');
      showSuccessToast('Reply saved', 'Your reply has been published.');
    } catch (err) {
      showErrorToast('Reply', err instanceof Error ? err.message : 'Failed to save reply.');
    }
  }

  async function handleDeleteReview(reviewId: string) {
    try {
      await deleteReview(reviewId);
      setAllReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showSuccessToast('Review deleted', 'The review has been removed.');
    } catch (err) {
      showErrorToast('Delete', err instanceof Error ? err.message : 'Failed to delete review.');
    }
  }

  async function handleOpenMessage(msg: ContactMessage) {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      try {
        await markMessageAsRead(msg.id);
        setContactMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
        setSelectedMessage((prev) => prev ? { ...prev, is_read: true } : prev);
      } catch {
        // Non-critical — don't interrupt the UX
      }
    }
  }

  async function handleDeleteMessage(id: string) {
    const confirmed = window.confirm('Are you sure you want to delete this message?');
    if (!confirmed) return;
    try {
      await deleteContactMessage(id);
      setContactMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedMessage((prev) => (prev?.id === id ? null : prev));
      showSuccessToast('Message deleted', 'The inquiry has been removed.');
    } catch (err) {
      showErrorToast('Delete', err instanceof Error ? err.message : 'Failed to delete message.');
    }
  }

  async function handleDeleteChatLog(id: string) {
    if (!window.confirm('Delete this conversation log?')) return;
    try {
      await deleteChatLog(id);
      setChatLogs((prev) => prev.filter((l) => l.id !== id));
      setSelectedChatLog((prev) => (prev?.id === id ? null : prev));
      showSuccessToast('Log deleted', 'Conversation log removed.');
    } catch (err) {
      showErrorToast('Delete', err instanceof Error ? err.message : 'Failed to delete log.');
    }
  }

  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (err) {
      showErrorToast('Status update', err instanceof Error ? err.message : 'Failed to update order status.');
      // Optimistic local update even if DB fails
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    }
  };

  // Handle product actions
  const handleEditProduct = async (productId: string) => {
    setProductActionError(null);
    setProductActionMessage(null);
    setIsProductActionPending(true);

    try {
      const product = await getProductById(productId);

      setEditProduct({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        care: product.care ?? '',
        slug: product.slug ?? '',
        metaTitle: product.metaTitle ?? '',
        metaDescription: product.metaDescription ?? '',
        metaKeywords: product.metaKeywords ?? '',
        ogTitle: product.ogTitle ?? '',
        ogDescription: product.ogDescription ?? '',
        isFeatured: product.isFeatured,
        images: product.images,
      });
      setOriginalEditImages(product.images);
      setEditImages(
        product.images.map((image, index) => ({
          id: `existing-${index}-${image}`,
          kind: 'existing',
          preview: image,
          originalUrl: image,
        }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load this product for editing.';
      setProductActionError(message);
    } finally {
      setIsProductActionPending(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const shouldDelete = window.confirm('Are you sure you want to delete this product?');

    if (!shouldDelete) {
      return;
    }

    setDeletingProductId(productId);
    setProductActionError(null);
    setProductActionMessage(null);

    try {
      await deleteProductById(productId);
      await refetchProducts();
      setProductActionMessage('Product deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete this product right now.';
      setProductActionError(message);
    } finally {
      setDeletingProductId(null);
    }
  };

  const closeEditModal = () => {
    setEditProduct(null);
    setEditImages([]);
    setOriginalEditImages([]);
  };

  const handleEditFieldChange = <K extends keyof EditProductFormState>(key: K, value: EditProductFormState[K]) => {
    setEditProduct((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        [key]: value,
      };
    });
  };

  const handleEditImageChange = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);

    if (nextFiles.length === 0) {
      return;
    }

    const invalidFile = nextFiles.find((file) => !file.type.startsWith('image/'));

    if (invalidFile) {
      setProductActionError('Please upload a valid image file.');
      return;
    }

    setProductActionError(null);

    void Promise.all(
      nextFiles.map(
        (file) =>
          new Promise<EditableImage>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                id: `new-${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
                kind: 'new',
                preview: reader.result as string,
                file,
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((nextImages) => {
      setEditImages((currentImages) => [...currentImages, ...nextImages]);
    });
  };

  const handleRemoveEditImage = (imageId: string) => {
    setEditImages((currentImages) => currentImages.filter((image) => image.id !== imageId));
  };

  const handleMoveEditImage = (fromIndex: number, toIndex: number) => {
    setEditImages((currentImages) => moveItem(currentImages, fromIndex, toIndex));
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editProduct) {
      return;
    }

    if (!editProduct.name || !editProduct.price || !editProduct.stock || !editProduct.description) {
      setProductActionError('Please fill in the required product fields before saving.');
      return;
    }

    setIsProductActionPending(true);
    setProductActionError(null);
    setProductActionMessage(null);

    try {
      const newImageFiles = editImages
        .filter((image): image is EditableImage & { file: File } => image.kind === 'new' && Boolean(image.file))
        .map((image) => image.file);
      const uploadedImages = newImageFiles.length > 0 ? await uploadProductImages(newImageFiles) : [];
      let uploadedImageIndex = 0;

      const images = editImages.map((image) => {
        if (image.kind === 'existing') {
          return image.originalUrl as string;
        }

        const uploadedImage = uploadedImages[uploadedImageIndex];
        uploadedImageIndex += 1;
        return uploadedImage;
      });

      const removedExistingImages = originalEditImages.filter((image) => !images.includes(image));

      if (images.length === 0) {
        setProductActionError('Please keep at least one product image.');
        setIsProductActionPending(false);
        return;
      }

      await updateProduct(editProduct.id, {
        name: editProduct.name,
        description: editProduct.description,
        price: Number(editProduct.price),
        stock: Number(editProduct.stock),
        images,
        isFeatured: editProduct.isFeatured,
        care: editProduct.care,
        slug: editProduct.slug,
        metaTitle: editProduct.metaTitle,
        metaDescription: editProduct.metaDescription,
        metaKeywords: editProduct.metaKeywords,
        ogTitle: editProduct.ogTitle,
        ogDescription: editProduct.ogDescription,
      });

      if (removedExistingImages.length > 0) {
        await deleteProductImages(removedExistingImages);
      }

      await refetchProducts();
      closeEditModal();
      setProductActionMessage('Product updated successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update this product right now.';
      setProductActionError(message);
    } finally {
      setIsProductActionPending(false);
    }
  };

  // Single source of truth for PKR formatting (uses formatPKR from pricing lib)
  const formatCurrency = formatPKR;

  // ── Revenue calculations ─────────────────────────────────────────────
  const now = new Date();
  const currentCalMonth = now.getMonth();
  const currentCalYear  = now.getFullYear();
  const prevCalMonth    = currentCalMonth === 0 ? 11 : currentCalMonth - 1;
  const prevCalYear     = currentCalMonth === 0 ? currentCalYear - 1 : currentCalYear;

  // All-time revenue (shown on Orders page)
  const allTimeRevenue = Math.round(orders.reduce((sum, order) => sum + order.total, 0));

  // Current calendar month revenue
  const currentMonthRevenue = Math.round(
    orders
      .filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === currentCalMonth && d.getFullYear() === currentCalYear;
      })
      .reduce((sum, o) => sum + o.total, 0)
  );

  // Previous calendar month revenue (for growth %)
  const previousMonthRevenue = Math.round(
    orders
      .filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === prevCalMonth && d.getFullYear() === prevCalYear;
      })
      .reduce((sum, o) => sum + o.total, 0)
  );

  const revenueGrowth = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0;

  const currentMonthOrders = orders.filter(o => {
    const d = new Date(o.date);
    return d.getMonth() === currentCalMonth && d.getFullYear() === currentCalYear;
  }).length;

  // Legacy derived metrics
  const totalSales    = allTimeRevenue;
  const pendingOrders = orders.filter(order => order.status === 'Processing' || order.status === 'Packed').length;
  const totalOrders   = orders.length;
  const totalCustomers = customerRecords.length;
  const featuredProductsCount = products.filter((product) => product.isFeatured).length;

  // Sales trend — keyed by YYYY-MM so months sort correctly across years
  const salesTrendData = (() => {
    const monthMap = new Map<string, { label: string; sales: number; orders: number; customers: Set<string> }>();
    for (const order of orders) {
      const date = new Date(order.date);
      const key   = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const existing = monthMap.get(key) ?? { label, sales: 0, orders: 0, customers: new Set<string>() };
      existing.sales += order.total;
      existing.orders += 1;
      existing.customers.add(order.customer);
      monthMap.set(key, existing);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => ({
        month: data.label,
        sales: Math.round(data.sales),
        orders: data.orders,
        customers: data.customers.size,
      }));
  })();

  // Derive category performance from real products
  const categoryPerformanceData = (() => {
    const catMap = new Map<string, number>();
    for (const product of products) {
      const cat = product.category || 'Other';
      catMap.set(cat, (catMap.get(cat) ?? 0) + product.price * (product.stock ?? 0));
    }
    return Array.from(catMap.entries()).map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue),
    })).sort((a, b) => b.revenue - a.revenue);
  })();

  // Contact messages derived values
  const unreadCount = contactMessages.filter((m) => !m.is_read).length;
  const filteredMessages = messageSearchQuery.trim()
    ? contactMessages.filter(
        (m) =>
          m.name.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
          m.subject.toLowerCase().includes(messageSearchQuery.toLowerCase())
      )
    : contactMessages;

  // Chat AI derived values
  const chatAiStats = {
    total: chatLogs.length,
    today: chatLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    uniqueUsers: new Set(chatLogs.filter(l => l.user_id).map(l => l.user_id)).size,
    productQueries: chatLogs.filter(l => l.intent === 'product_search').length,
  };
  const intentCounts = chatLogs.reduce<Record<string, number>>((acc, l) => {
    acc[l.intent] = (acc[l.intent] ?? 0) + 1;
    return acc;
  }, {});
  const filteredChatLogs = chatLogSearch.trim()
    ? chatLogs.filter(
        (l) =>
          l.user_message.toLowerCase().includes(chatLogSearch.toLowerCase()) ||
          l.assistant_message.toLowerCase().includes(chatLogSearch.toLowerCase()) ||
          l.intent.toLowerCase().includes(chatLogSearch.toLowerCase())
      )
    : chatLogs;
  function chatIntentStyle(intent: string): { bg: string; color: string; border: string; label: string } {
    switch (intent) {
      case 'product_search': return { bg: '#DCFCE7', color: '#166534', border: '#A7F3D0', label: 'Product Search' };
      case 'order_tracking': return { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE', label: 'Order Tracking' };
      case 'cart':           return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Cart' };
      case 'faq':            return { bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE', label: 'FAQ' };
      default:               return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', label: 'General' };
    }
  }

  const recentActivities = [
    `${totalCustomers} registered customers on the platform.`,
    `${pendingOrders} orders are waiting for fulfillment review today.`,
    `${featuredProductsCount} products are currently highlighted on the storefront.`,
    previousMonthRevenue > 0
      ? `This month revenue is ${revenueGrowth >= 0 ? 'up' : 'down'} ${Math.abs(revenueGrowth).toFixed(1)}% vs last month.`
      : `${formatCurrency(currentMonthRevenue)} revenue this calendar month.`,
    ...(unreadCount > 0 ? [`${unreadCount} unread customer ${unreadCount === 1 ? 'inquiry' : 'inquiries'} awaiting review.`] : []),
  ];
  const topCustomers = [...customerRecords]
    .sort((firstCustomer, secondCustomer) => secondCustomer.totalSpent - firstCustomer.totalSpent)
    .slice(0, 3);

  const formatShortDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getCustomerRoleStyles = (role: string) => {
    if (role === 'admin') {
      return {
        backgroundColor: '#FCE7F3',
        border: '1px solid #F9A8D4',
        color: '#9D174D',
      };
    }

    return {
      backgroundColor: '#DCFCE7',
      border: '1px solid #86EFAC',
      color: '#166534',
    };
  };

  // Status badge styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Processing':
        return {
          backgroundColor: '#FFF4E6',
          color: '#D97706',
          border: '1px solid #FDE68A',
        };
      case 'Shipped':
        return {
          backgroundColor: '#DBEAFE',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
        };
      case 'Delivered':
        return {
          backgroundColor: '#D1FAE5',
          color: '#059669',
          border: '1px solid #A7F3D0',
        };
      default:
        return {
          backgroundColor: '#F3F4F6',
          color: '#6B7280',
          border: '1px solid #E5E7EB',
        };
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FAFAFA' }}>
      <PageSeo title="Admin Dashboard" />

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 border-r transform transition-all duration-200 lg:static lg:translate-x-0 flex flex-col flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ 
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E8D5F5',
          width: sidebarCollapsed ? '56px' : '256px',
        }}
        aria-label="Admin navigation"
      >
        {/* Admin Logo & Header */}
        <header style={{ padding: sidebarCollapsed ? '14px 8px' : '20px 16px 18px', borderBottom: '1px solid #E8D5F5', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', flexShrink: 0, flexDirection: sidebarCollapsed ? 'column' : 'row', gap: sidebarCollapsed ? '8px' : '0' }}>
          {!sidebarCollapsed ? (
            <div>
              <Link to="/" style={{ display: 'block', textDecoration: 'none', marginBottom: '10px' }}>
                <img src={cozipLogo} alt="Bejeweled" style={{ height: '40px', width: 'auto', display: 'block' }} />
              </Link>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', backgroundColor: '#F3EEF8', borderRadius: '3px', border: '1px solid #E8D5F5' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#C9A84C', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5B1E6E' }}>Admin Panel</span>
              </div>
            </div>
          ) : (
            <Link to="/" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              <img src={cozipLogo} alt="Bejeweled" style={{ height: '28px', width: '28px', borderRadius: '3px', objectFit: 'cover', display: 'block' }} />
            </Link>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8FAA', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <button
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8FAA', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
        </header>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '10px 6px' : '14px 10px' }} aria-label="Admin sections">

          {/* ── COMMERCE ─── */}
          {!sidebarCollapsed && <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', padding: '0 8px', marginBottom: '5px', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>Commerce</p>}
          {sidebarCollapsed && <div style={{ height: '1px', backgroundColor: '#F0E8F8', margin: '4px 4px 6px' }} />}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {([
              { view: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
              { view: 'orders',    label: 'Orders',    Icon: ShoppingCart },
              { view: 'products',  label: 'Products',  Icon: Package },
              { view: 'customers', label: 'Customers', Icon: Users },
              { view: 'coupons',   label: 'Coupons',   Icon: Tag },
            ] as const).map(({ view, label, Icon }) => {
              const active = activeView === view;
              return (
                <li key={view}>
                  <button
                    onClick={() => { setActiveView(view); setSidebarOpen(false); }}
                    aria-current={active ? 'page' : undefined}
                    title={sidebarCollapsed ? label : undefined}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '9px',
                      padding: sidebarCollapsed ? '9px' : '8px 10px', borderRadius: '3px',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      background: active ? '#F3EEF8' : 'transparent',
                      color: active ? '#3B0D4A' : '#6B4F7A',
                      fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem',
                      fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      borderLeft: !sidebarCollapsed ? (active ? '2px solid #5B1E6E' : '2px solid transparent') : 'none',
                      outline: sidebarCollapsed && active ? '2px solid #5B1E6E' : 'none',
                      outlineOffset: '-2px',
                      transition: 'background 0.12s', letterSpacing: '0.01em',
                    }}
                  >
                    <Icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div style={{ height: '1px', backgroundColor: '#F0E8F8', margin: '0 8px 12px' }} />

          {/* ── MARKETING ─── */}
          {!sidebarCollapsed && <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', padding: '0 8px', marginBottom: '5px', fontFamily: 'Inter, sans-serif' }}>Marketing</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {([
              { view: 'analytics', label: 'Analytics',   Icon: BarChart3     },
              { view: 'blog',      label: 'Blog CMS',    Icon: MessageSquare },
              { view: 'seo',       label: 'SEO Manager', Icon: Sparkles      },
              { view: 'reviews',   label: 'Reviews',     Icon: Star          },
            ] as const).map(({ view, label, Icon }) => {
              const active = activeView === view;
              return (
                <li key={view}>
                  <button
                    onClick={() => { setActiveView(view); setSidebarOpen(false); }}
                    aria-current={active ? 'page' : undefined}
                    title={sidebarCollapsed ? label : undefined}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '9px',
                      padding: sidebarCollapsed ? '9px' : '8px 10px', borderRadius: '3px',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      background: active ? '#F3EEF8' : 'transparent',
                      color: active ? '#3B0D4A' : '#6B4F7A',
                      fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem',
                      fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      borderLeft: !sidebarCollapsed ? (active ? '2px solid #5B1E6E' : '2px solid transparent') : 'none',
                      outline: sidebarCollapsed && active ? '2px solid #5B1E6E' : 'none',
                      outlineOffset: '-2px',
                      transition: 'background 0.12s', letterSpacing: '0.01em',
                    }}
                  >
                    <Icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div style={{ height: '1px', backgroundColor: '#F0E8F8', margin: '0 8px 12px' }} />

          {/* ── SUPPORT ─── */}
          {!sidebarCollapsed && <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: '#C9A84C', padding: '0 8px', marginBottom: '5px', fontFamily: 'Inter, sans-serif' }}>Support</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <li>
              <button
                onClick={() => { setActiveView('inquiries'); setSidebarOpen(false); }}
                aria-current={activeView === 'inquiries' ? 'page' : undefined}
                title={sidebarCollapsed ? 'Contact Forms' : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '9px',
                  padding: sidebarCollapsed ? '9px' : '8px 10px', borderRadius: '3px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  background: activeView === 'inquiries' ? '#F3EEF8' : 'transparent',
                  color: activeView === 'inquiries' ? '#3B0D4A' : '#6B4F7A',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem',
                  fontWeight: activeView === 'inquiries' ? 600 : 400, border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  borderLeft: !sidebarCollapsed ? (activeView === 'inquiries' ? '2px solid #5B1E6E' : '2px solid transparent') : 'none',
                  outline: sidebarCollapsed && activeView === 'inquiries' ? '2px solid #5B1E6E' : 'none',
                  outlineOffset: '-2px',
                  transition: 'background 0.12s', letterSpacing: '0.01em',
                }}
              >
                <Inbox size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && (
                  <>
                    <span style={{ flex: 1 }}>Contact Forms</span>
                    {unreadCount > 0 && (
                      <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '3px', padding: '1px 5px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '4px', right: '4px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'block' }} />
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveView('chatai'); setSidebarOpen(false); }}
                aria-current={activeView === 'chatai' ? 'page' : undefined}
                title={sidebarCollapsed ? 'Chat Intents' : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: sidebarCollapsed ? '0' : '9px',
                  padding: sidebarCollapsed ? '9px' : '8px 10px', borderRadius: '3px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  background: activeView === 'chatai' ? '#F3EEF8' : 'transparent',
                  color: activeView === 'chatai' ? '#3B0D4A' : '#6B4F7A',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem',
                  fontWeight: activeView === 'chatai' ? 600 : 400, border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  borderLeft: !sidebarCollapsed ? (activeView === 'chatai' ? '2px solid #5B1E6E' : '2px solid transparent') : 'none',
                  outline: sidebarCollapsed && activeView === 'chatai' ? '2px solid #5B1E6E' : 'none',
                  outlineOffset: '-2px',
                  transition: 'background 0.12s', letterSpacing: '0.01em',
                }}
              >
                <Bot size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && 'Chat Intents'}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto">
        {/* Header with Title and Action Button */}
        <header 
          className="border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between gap-4"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 flex-shrink-0"
              style={{ borderRadius: '3px' }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" style={{ color: '#5B1E6E' }} />
            </button>
            <div className="min-w-0">
              <h2 
                className="text-xl sm:text-2xl lg:text-3xl mb-1 truncate" 
                style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}
              >
              {activeView === 'overview' && 'Dashboard Overview'}
              {activeView === 'products' && 'Product Catalog'}
              {activeView === 'orders' && 'Orders Management'}
              {activeView === 'customers' && 'Customer Management'}
              {activeView === 'coupons' && 'Coupon Management'}
              {activeView === 'analytics' && 'Sales Analytics'}
              {activeView === 'seo' && 'AI SEO Manager'}
              {activeView === 'blog' && 'Blog CMS'}
              {activeView === 'reviews' && 'Customer Reviews'}
              {activeView === 'inquiries' && 'Contact Forms'}
              {activeView === 'chatai' && 'Chat Intents'}
            </h2>
            <p 
              className="text-sm"
              style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}
            >
              {activeView === 'orders' && 'View and manage all customer orders'}
              {activeView === 'products' && 'Manage your jewelry catalog'}
              {activeView === 'customers' && 'View customer information'}
              {activeView === 'overview' && 'Key metrics and insights'}
              {activeView === 'coupons' && 'Manage and create coupons'}
              {activeView === 'analytics' && 'Analyze sales trends and performance'}
              {activeView === 'seo' && 'Generate SEO metadata for products, categories, and pages'}
              {activeView === 'blog' && 'Create, edit, and publish blog posts'}
              {activeView === 'reviews' && 'View and reply to customer product reviews'}
              {activeView === 'inquiries' && 'View and manage contact form submissions'}
              {activeView === 'chatai' && 'Conversation history and intent analytics'}
            </p>
            </div>
          </div>

          {/* Add Product/Coupon Button */}
          {activeView === 'products' && (
            <Link
              to="/admin/add-product"
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 flex-shrink-0"
              style={{
                backgroundColor: '#5B1E6E',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                borderRadius: '3px',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Product
            </Link>
          )}

          {activeView === 'coupons' && (
            <button
              onClick={() => { resetCouponForm(); setShowAddCouponModal(true); setTimeout(() => couponCodeRef.current?.focus(), 80); }}
              className="flex items-center gap-2 px-5 py-2.5"
              style={{
                backgroundColor: '#5B1E6E',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                borderRadius: '3px',
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Coupon
            </button>
          )}

          {/* Back to Store + Sign Out */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 text-sm"
              style={{ border: '1px solid #E8D5F5', color: '#6B4F7A', fontFamily: 'Inter, sans-serif', fontWeight: 500, borderRadius: '3px', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Back to Store
            </Link>
            <button
              onClick={async () => { await signOut(); navigate('/admin/login'); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm"
              style={{ border: '1px solid #FECACA', color: '#DC2626', fontFamily: 'Inter, sans-serif', fontWeight: 500, borderRadius: '3px', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <LogOut size={14} aria-hidden="true" />
              Sign Out
            </button>
          </div>

        </header>

        {/* ORDERS VIEW CONTENT */}
        {activeView === 'orders' && (
          <div style={{ padding: '28px 28px 60px', maxWidth: '1400px' }}>
            <header style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '5px', marginTop: 0, fontFamily: 'Inter, sans-serif' }}>COMMERCE</p>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 3vw, 1.875rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.2 }}>Orders</h1>
              <p style={{ color: '#9B8FAA', fontSize: '0.8125rem', margin: 0, fontFamily: 'Inter, sans-serif' }}>All customer orders — update status and track fulfillment.</p>
            </header>

            {/* KPI Row */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ marginBottom: '24px' }} aria-label="Order metrics">
              {([
                { label: 'All-Time Revenue', value: formatCurrency(allTimeRevenue), note: `${totalOrders} orders total`, accent: '#5B1E6E' },
                { label: 'Pending Fulfillment', value: String(pendingOrders), note: pendingOrders > 0 ? 'Needs attention' : 'All fulfilled', accent: pendingOrders > 0 ? '#D97706' : '#059669' },
                { label: 'Total Orders', value: String(totalOrders), note: 'All time', accent: '#1A0A24' },
                { label: 'Unique Customers', value: String(totalCustomers), note: 'Registered accounts', accent: '#2563EB' },
              ] as const).map((kpi) => (
                <article key={kpi.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', borderTop: `2px solid ${kpi.accent}`, padding: '18px 20px' }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 7px', fontFamily: 'Inter, sans-serif' }}>{kpi.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1 }}>{kpi.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9B8FAA', margin: 0, fontFamily: 'Inter, sans-serif' }}>{kpi.note}</p>
                </article>
              ))}
            </section>

            {/* Orders List */}
            <section aria-labelledby="orders-list-heading">
              <header style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="orders-list-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>All Orders</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>{orders.length} total</p>
              </header>

              {orders.length === 0 ? (
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.875rem', margin: 0 }}>{dataLoading ? 'Loading orders…' : 'No orders yet.'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {orders.map((order) => (
                    <article key={order.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '16px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      {/* Order ID */}
                      <div style={{ flex: '0 0 auto', minWidth: '110px' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 3px' }}>Order</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 700, fontSize: '0.8125rem', margin: 0 }}>#{order.id.slice(-8).toUpperCase()}</p>
                      </div>

                      {/* Customer */}
                      <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 3px' }}>Customer</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.8125rem', margin: 0 }}>{order.customer}</p>
                      </div>

                      {/* Date */}
                      <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 3px' }}>Date</p>
                        <time dateTime={order.date} style={{ fontFamily: 'Inter, sans-serif', color: '#6B4F7A', fontSize: '0.8125rem' }}>
                          {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>

                      {/* Total */}
                      <div style={{ flex: '0 0 auto', minWidth: '100px' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 3px' }}>Total</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{formatPKR(order.total)}</p>
                      </div>

                      {/* Status */}
                      <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 5px' }}>Status</p>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          style={{
                            ...getStatusStyles(order.status),
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            outline: 'none',
                            borderRadius: '3px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                          }}
                          aria-label={`Status for order ${order.id}`}
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* PRODUCTS VIEW CONTENT */}
        {activeView === 'products' && (
          <div style={{ padding: '28px 28px 60px', maxWidth: '1400px' }}>
            {(productActionError || productActionMessage) && (
              <div
                style={{
                  marginBottom: '20px',
                  border: '1px solid',
                  borderRadius: '3px',
                  padding: '12px 16px',
                  backgroundColor: productActionError ? '#FEF2F2' : '#F0FDF4',
                  borderColor: productActionError ? '#FECACA' : '#BBF7D0',
                  color: productActionError ? '#B91C1C' : '#166534',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.875rem',
                }}
              >
                {productActionError ?? productActionMessage}
              </div>
            )}

            {/* KPI Row */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ marginBottom: '24px' }} aria-label="Product metrics">
              {[
                { label: 'Catalog Size', value: String(products.length), note: 'Available in catalog' },
                { label: 'Total Stock', value: String(products.reduce((sum, p) => sum + p.stock, 0)), note: 'Available units' },
                { label: 'Inventory Value', value: formatCurrency(products.reduce((sum, p) => sum + p.price * p.stock, 0)), note: 'Inventory worth' },
                { label: 'Low Stock', value: String(products.filter(p => p.stock < 5).length), note: 'Need restocking', isWarning: true },
              ].map((kpi) => (
                <article key={kpi.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 7px', fontFamily: 'Inter, sans-serif' }}>{kpi.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.625rem', color: kpi.isWarning ? '#D97706' : '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1 }}>{kpi.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9B8FAA', margin: 0, fontFamily: 'Inter, sans-serif' }}>{kpi.note}</p>
                </article>
              ))}
            </section>

            {/* Products Table */}
            <section aria-labelledby="products-table-heading">
              <header style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="products-table-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Product Catalog</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>{products.length} items</p>
              </header>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', overflow: 'hidden', overflowX: 'auto' }}>
                {productsLoading ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.875rem' }}>Loading products…</div>
                ) : productsError ? (
                  <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: '#DC2626', fontSize: '0.875rem' }}>{productsError}</div>
                ) : (
                  <div style={{ minWidth: '560px' }}>
                    {/* List header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 120px 90px 80px', padding: '10px 20px', backgroundColor: '#FAFAFA', borderBottom: '1px solid #E8D5F5' }}>
                      {['', 'NAME', 'PRICE', 'STOCK', ''].map((col, i) => (
                        <span key={i} style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{col}</span>
                      ))}
                    </div>
                    {/* List rows */}
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        style={{ display: 'grid', gridTemplateColumns: '64px 1fr 120px 90px 80px', padding: '14px 20px', borderBottom: index !== products.length - 1 ? '1px solid #F3EEF8' : 'none', transition: 'background-color 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <img src={product.image} alt={product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', border: '1px solid #E8D5F5', backgroundColor: '#FAF7FF', alignSelf: 'center' }} />
                        <span style={{ color: '#1A0A24', fontWeight: 500, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>{product.name}</span>
                        <span style={{ color: '#5B1E6E', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', alignSelf: 'center' }}>{product.formattedPrice}</span>
                        <span style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px', color: product.stock < 5 ? '#D97706' : '#6B4F7A', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}>
                          {product.stock < 5 && <AlertTriangle size={11} aria-hidden="true" />}
                          {product.stock}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', alignSelf: 'center' }}>
                          <button
                            onClick={() => handleEditProduct(product.id)}
                            disabled={isProductActionPending}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', backgroundColor: 'transparent', color: '#9B8FAA', border: '1px solid #E8D5F5', cursor: isProductActionPending ? 'not-allowed' : 'pointer', opacity: isProductActionPending ? 0.5 : 1 }}
                            aria-label={`Edit ${product.name}`}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F0E6F6'; e.currentTarget.style.color = '#5B1E6E'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9B8FAA'; }}
                          ><Edit2 size={13} aria-hidden="true" /></button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deletingProductId === product.id}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', backgroundColor: 'transparent', color: '#9B8FAA', border: '1px solid #E8D5F5', cursor: deletingProductId === product.id ? 'not-allowed' : 'pointer', opacity: deletingProductId === product.id ? 0.5 : 1 }}
                            aria-label={`Delete ${product.name}`}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9B8FAA'; }}
                          ><Trash2 size={13} aria-hidden="true" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* COUPONS VIEW CONTENT */}
        {activeView === 'coupons' && (
          <div style={{ padding: '28px 28px 60px', maxWidth: '1400px' }}>
            <header style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '5px', marginTop: 0, fontFamily: 'Inter, sans-serif' }}>PROMOTIONS</p>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 3vw, 1.875rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.2 }}>Coupons</h1>
              <p style={{ color: '#9B8FAA', fontSize: '0.8125rem', margin: 0, fontFamily: 'Inter, sans-serif' }}>Create and manage discount codes. Click a coupon to view details.</p>
            </header>

            {/* KPI Row */}
            <section className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ marginBottom: '24px' }} aria-label="Coupon metrics">
              {([
                { label: 'Total Coupons', value: String(coupons.length), note: 'All codes', accent: '#5B1E6E' },
                { label: 'Active', value: String(coupons.filter(c => c.status === 'Active').length), note: 'Currently live', accent: '#2563EB' },
                { label: 'Expired', value: String(coupons.filter(c => c.status === 'Expired').length), note: 'No longer valid', accent: '#DC2626' },
                { label: 'Total Redemptions', value: String(coupons.reduce((s, c) => s + c.usedCount, 0)), note: 'Times used', accent: '#059669' },
              ] as const).map((kpi) => (
                <article key={kpi.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 7px', fontFamily: 'Inter, sans-serif' }}>{kpi.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1 }}>{kpi.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9B8FAA', margin: 0, fontFamily: 'Inter, sans-serif' }}>{kpi.note}</p>
                </article>
              ))}
            </section>

            {/* Coupons Grid */}
            {coupons.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.875rem', margin: 0 }}>No coupons yet. Create your first discount code.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {coupons.map((coupon) => {
                  const isExhausted = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;
                  const pct = coupon.usageLimit > 0 ? Math.min((coupon.usedCount / coupon.usageLimit) * 100, 100) : 0;
                  return (
                    <button
                      key={coupon.id}
                      onClick={() => setSelectedCoupon(coupon)}
                      style={{ textAlign: 'left', backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px', cursor: 'pointer', width: '100%', transition: 'box-shadow 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(91,30,110,0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                      aria-label={`View coupon ${coupon.code}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#1A0A24', letterSpacing: '0.04em' }}>{coupon.code}</span>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '3px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          fontFamily: 'Inter, sans-serif',
                          color: coupon.status === 'Active' ? '#1D4ED8' : '#DC2626',
                          backgroundColor: coupon.status === 'Active' ? '#DBEAFE' : '#FEE2E2',
                          border: coupon.status === 'Active' ? '1px solid #BFDBFE' : '1px solid #FCA5A5',
                        }}>{coupon.status}</span>
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#5B1E6E', fontWeight: 600, margin: '0 0 10px' }}>
                        {coupon.discountType === 'percent' ? `${coupon.discountValue}% off` : `PKR ${coupon.discountValue.toLocaleString()} off`}
                      </p>
                      {coupon.usageLimit > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9B8FAA' }}>Usage</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: isExhausted ? '#DC2626' : '#6B4F7A', fontWeight: 600 }}>{coupon.usedCount} / {coupon.usageLimit}</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: '#F0E8F5', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: isExhausted ? '#DC2626' : '#5B1E6E', borderRadius: '2px', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Coupon Detail Modal */}
            {selectedCoupon && !couponStatusConfirm && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,10,36,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setSelectedCoupon(null)}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '4px', width: '100%', maxWidth: '420px', padding: '28px', boxShadow: '0 20px 60px rgba(26,10,36,0.2)' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.125rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Coupon Details</h2>
                    <button onClick={() => setSelectedCoupon(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: '1px solid #E8D5F5', borderRadius: '3px', backgroundColor: 'transparent', cursor: 'pointer', color: '#6B4F7A' }} aria-label="Close">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', backgroundColor: '#FAF7FF', border: '1px solid #E8D5F5', borderRadius: '3px', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#1A0A24', letterSpacing: '0.06em' }}>{selectedCoupon.code}</span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '3px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif',
                      color: selectedCoupon.status === 'Active' ? '#1D4ED8' : '#DC2626',
                      backgroundColor: selectedCoupon.status === 'Active' ? '#DBEAFE' : '#FEE2E2',
                      border: selectedCoupon.status === 'Active' ? '1px solid #BFDBFE' : '1px solid #FCA5A5',
                    }}>{selectedCoupon.status}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Discount', value: selectedCoupon.discountType === 'percent' ? `${selectedCoupon.discountValue}% off` : `PKR ${selectedCoupon.discountValue.toLocaleString()} off` },
                      { label: 'Usage Limit', value: selectedCoupon.usageLimit > 0 ? String(selectedCoupon.usageLimit) : 'Unlimited' },
                      { label: 'Times Used', value: String(selectedCoupon.usedCount) },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F5EFF8' }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#9B8FAA' }}>{row.label}</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#1A0A24', fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}
                    {selectedCoupon.usageLimit > 0 && (
                      <div style={{ paddingTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9B8FAA' }}>Redemption progress</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#6B4F7A', fontWeight: 600 }}>{Math.round((selectedCoupon.usedCount / selectedCoupon.usageLimit) * 100)}%</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#F0E8F5', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min((selectedCoupon.usedCount / selectedCoupon.usageLimit) * 100, 100)}%`, backgroundColor: selectedCoupon.usedCount >= selectedCoupon.usageLimit ? '#DC2626' : '#5B1E6E', borderRadius: '3px' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const isExhausted = selectedCoupon.usageLimit > 0 && selectedCoupon.usedCount >= selectedCoupon.usageLimit;
                        if (selectedCoupon.status === 'Active') {
                          setCouponStatusConfirm({ coupon: selectedCoupon, newStatus: 'Expired' });
                        } else if (!isExhausted) {
                          setCouponStatusConfirm({ coupon: selectedCoupon, newStatus: 'Active' });
                        }
                      }}
                      disabled={selectedCoupon.status === 'Expired' && selectedCoupon.usageLimit > 0 && selectedCoupon.usedCount >= selectedCoupon.usageLimit}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: '3px',
                        border: '1px solid',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer',
                        backgroundColor: selectedCoupon.status === 'Active' ? '#FEF3C7' : '#DBEAFE',
                        color: selectedCoupon.status === 'Active' ? '#92400E' : '#1D4ED8',
                        borderColor: selectedCoupon.status === 'Active' ? '#FDE68A' : '#BFDBFE',
                      }}
                    >
                      {selectedCoupon.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={async () => {
                        await deleteCoupon(selectedCoupon.id);
                        setCoupons(prev => prev.filter(c => c.id !== selectedCoupon.id));
                        setSelectedCoupon(null);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '9px 14px', borderRadius: '3px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status Change Confirmation */}
            {couponStatusConfirm && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26,10,36,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '4px', width: '100%', maxWidth: '360px', padding: '28px', boxShadow: '0 20px 60px rgba(26,10,36,0.25)' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 10px' }}>
                    {couponStatusConfirm.newStatus === 'Expired' ? 'Deactivate Coupon' : 'Activate Coupon'}
                  </h2>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#6B4F7A', margin: '0 0 24px', lineHeight: 1.6 }}>
                    {couponStatusConfirm.newStatus === 'Expired'
                      ? `Are you sure you want to deactivate "${couponStatusConfirm.coupon.code}"? Customers will no longer be able to use this code.`
                      : `Activate "${couponStatusConfirm.coupon.code}"? Customers will be able to use this code immediately.`}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCouponStatusConfirm(null)}
                      style={{ flex: 1, padding: '9px 0', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#5B1E6E', fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                    >Cancel</button>
                    <button
                      disabled={couponStatusPending}
                      onClick={async () => {
                        setCouponStatusPending(true);
                        try {
                          await updateCouponStatus(couponStatusConfirm.coupon.id, couponStatusConfirm.newStatus);
                          setCoupons(prev => prev.map(c => c.id === couponStatusConfirm.coupon.id ? { ...c, status: couponStatusConfirm.newStatus } : c));
                          setSelectedCoupon(prev => prev?.id === couponStatusConfirm.coupon.id ? { ...prev, status: couponStatusConfirm.newStatus } : prev);
                        } finally {
                          setCouponStatusPending(false);
                          setCouponStatusConfirm(null);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: '3px',
                        border: 'none',
                        backgroundColor: couponStatusConfirm.newStatus === 'Expired' ? '#DC2626' : '#5B1E6E',
                        color: '#FFFFFF',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        cursor: couponStatusPending ? 'not-allowed' : 'pointer',
                        opacity: couponStatusPending ? 0.7 : 1,
                      }}
                    >{couponStatusPending ? 'Saving…' : 'Confirm'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS VIEW CONTENT */}
        {activeView === 'analytics' && <AdminAnalytics />}
        {activeView === 'seo' && <AdminSeo />}
        {activeView === 'blog' && <AdminBlog />}

        {/* PLACEHOLDER VIEWS */}

        {/* PLACEHOLDER VIEWS */}
        {activeView === 'overview' && (
          <div style={{ padding: '28px 28px 60px', maxWidth: '1400px' }}>

            {/* ── Quick Actions Bar ── */}
            <div className="flex gap-3 overflow-x-auto mb-8 pb-1">
              {[
                { label: 'Add Product', isLink: true, href: '/admin/add-product' },
                { label: 'Create Coupon', to: 'coupons' as const },
                { label: 'View Analytics', to: 'analytics' as const },
                { label: 'SEO Manager', to: 'seo' as const },
                { label: 'Customers', to: 'customers' as const },
                { label: 'Inquiries', to: 'inquiries' as const },
              ].map((action) =>
                'href' in action && action.href ? (
                  <Link
                    key={action.label}
                    to={action.href}
                    className="flex-shrink-0 px-4 py-2 text-xs font-medium tracking-wide transition-colors"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', color: '#6B4F7A', borderRadius: '3px', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#C9A84C'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#C9A84C'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#6B4F7A'; (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E8D5F5'; }}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    onClick={() => 'to' in action && action.to && setActiveView(action.to)}
                    className="flex-shrink-0 px-4 py-2 text-xs font-medium tracking-wide transition-colors"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', color: '#6B4F7A', borderRadius: '3px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#C9A84C'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C9A84C'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6B4F7A'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8D5F5'; }}
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>

            {/* ── KPI ROW ── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5" aria-label="Key metrics">
              {[
                {
                  label: 'Monthly Revenue',
                  value: dataLoading ? '—' : formatCurrency(currentMonthRevenue),
                  trend: previousMonthRevenue > 0 ? `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs last month` : 'Current month',
                  trendPositive: revenueGrowth >= 0,
                },
                {
                  label: 'Total Customers',
                  value: dataLoading ? '—' : totalCustomers.toString(),
                  trend: 'Registered accounts',
                  trendPositive: true,
                },
                {
                  label: 'Pending Orders',
                  value: dataLoading ? '—' : pendingOrders.toString(),
                  trend: pendingOrders > 0 ? 'Awaiting fulfillment' : 'All fulfilled',
                  trendPositive: pendingOrders === 0,
                },
                {
                  label: 'Avg Order Value',
                  value: dataLoading ? '—' : (totalOrders > 0 ? formatCurrency(Math.round(allTimeRevenue / totalOrders)) : '—'),
                  trend: `Across ${totalOrders} orders`,
                  trendPositive: true,
                },
              ].map((kpi) => (
                <article key={kpi.label} className="flex flex-col justify-between" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '20px 22px' }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>{kpi.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.25rem', color: '#C9A84C', fontWeight: 600, margin: '0 0 6px', lineHeight: 1 }}>{kpi.value}</p>
                  <p style={{ fontSize: '0.75rem', color: kpi.trendPositive ? '#059669' : '#D97706', margin: 0, fontFamily: 'Inter, sans-serif' }}>{kpi.trend}</p>
                </article>
              ))}
            </section>

            {/* ── REVENUE CHART ── */}
            {salesTrendData.length > 0 && (
              <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '22px 24px', marginBottom: '20px' }} aria-label="Revenue chart">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 2px' }}>Revenue Trend</h2>
                    <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.78rem', margin: 0 }}>Monthly sales performance</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#5B1E6E', fontWeight: 600, margin: 0 }}>{formatCurrency(currentMonthRevenue)}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9B8FAA', margin: 0 }}>This month</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={salesTrendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminRevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B1E6E" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#5B1E6E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5EFF8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#9B8FAA' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fill: '#9B8FAA' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={36} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', boxShadow: '0 4px 16px rgba(26,10,36,0.08)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelStyle={{ color: '#1A0A24', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#5B1E6E" strokeWidth={2} fill="url(#adminRevGradient)" dot={false} activeDot={{ r: 4, fill: '#5B1E6E', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* ── BOTTOM GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Recent Activity — 8 cols */}
              <section className="col-span-12 md:col-span-8" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '22px 24px' }} aria-labelledby="activity-heading">
                <h2 id="activity-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 14px' }}>Recent Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentActivities.map((activity, index) => (
                    <div key={activity} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '9px 0', borderBottom: index < recentActivities.length - 1 ? '1px solid #F5EFF8' : 'none' }}>
                      <span style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '3px', backgroundColor: '#F3EEF8', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{index + 1}</span>
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>{activity}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Top Customers — 4 cols */}
              <section className="col-span-12 md:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '22px 24px' }} aria-labelledby="top-customers-heading">
                  <h2 id="top-customers-heading" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 12px' }}>Top Customers</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {topCustomers.length === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>No customer data yet.</p>
                    ) : topCustomers.map((customer, i) => (
                      <div key={customer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < topCustomers.length - 1 ? '1px solid #F5EFF8' : 'none', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.8125rem', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.75rem', margin: 0 }}>{customer.orderCount} orders</p>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatCurrency(customer.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: pendingOrders > 0 ? '#FFFBF0' : '#FFFFFF', border: `1px solid ${pendingOrders > 0 ? '#E0C860' : '#E8D5F5'}`, borderRadius: '4px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Pending Orders</h2>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: pendingOrders > 0 ? '#D97706' : '#059669', fontWeight: 600 }}>{pendingOrders}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', color: '#6B4F7A', fontSize: '0.8rem', margin: '0 0 12px' }}>
                    {pendingOrders > 0 ? 'Orders awaiting processing or fulfillment.' : 'All orders are up to date.'}
                  </p>
                  <button onClick={() => setActiveView('orders')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#5B1E6E', color: '#FFFFFF', border: 'none', borderRadius: '3px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    View Orders <ArrowUpRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === 'customers' && (
          <div style={{ padding: '28px 28px 60px', maxWidth: '1400px' }}>
            <header style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600, marginBottom: '5px', marginTop: 0, fontFamily: 'Inter, sans-serif' }}>AUDIENCE</p>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 3vw, 1.875rem)', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.2 }}>Customers</h1>
              <p style={{ color: '#9B8FAA', fontSize: '0.8125rem', margin: 0, fontFamily: 'Inter, sans-serif' }}>Registered accounts, spending, and engagement overview.</p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ marginBottom: '24px' }} aria-label="Customer metrics">
              {([
                { label: 'Customer Base', value: customerRecords.length.toString(), note: 'Registered profiles', accent: '#5B1E6E' },
                { label: 'Total Revenue', value: formatCurrency(Math.round(customerRecords.reduce((s, c) => s + c.totalSpent, 0))), note: 'From all customer orders', accent: '#059669' },
                { label: 'Avg Lifetime Value', value: customerRecords.length > 0 ? formatCurrency(Math.round(customerRecords.reduce((s, c) => s + c.totalSpent, 0) / customerRecords.length)) : formatCurrency(0), note: 'Per customer', accent: '#2563EB' },
              ] as const).map((m) => (
                <article key={m.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', borderTop: `2px solid ${m.accent}`, padding: '18px 20px' }}>
                  <p style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 500, margin: '0 0 7px', fontFamily: 'Inter, sans-serif' }}>{m.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', lineHeight: 1 }}>{m.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9B8FAA', margin: 0, fontFamily: 'Inter, sans-serif' }}>{m.note}</p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-4" aria-label="Customer insights">
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ borderBottom: '1px solid #F3F0F7', padding: '18px 20px' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 2px' }}>Customer Directory</h2>
                  <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>All registered user profiles from the database.</p>
                </div>
                {customerRecords.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.875rem' }}>
                    {dataLoading ? 'Loading customers…' : 'No customers yet.'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0">
                    {/* Header Row */}
                    <div className="grid grid-cols-4 items-center px-4 py-3" style={{ backgroundColor: '#FAF7FF', borderBottom: '1px solid #E8D5F5' }}>
                      {['Customer', 'Orders', 'Spent', 'Role'].map((col) => (
                        <span key={col} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontWeight: 600 }}>{col}</span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 p-3">
                      {customerRecords.map((customer) => (
                        <div key={customer.id} className="grid grid-cols-4 items-center transition-colors p-4 rounded-sm" style={{ backgroundColor: '#FAFAFA', border: '1px solid #F3F0F7' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3EEF8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA'; }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', margin: '0 0 2px' }}>{customer.name}</p>
                            <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', margin: 0 }}>{customer.email}</p>
                          </div>
                          <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{customer.orderCount}</span>
                          <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>{formatCurrency(customer.totalSpent)}</span>
                          <span style={{ ...getCustomerRoleStyles(customer.role), display: 'inline-block', padding: '3px 9px', borderRadius: '3px', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'Inter, sans-serif' }}>
                            {customer.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 14px' }}>Top Customers</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {topCustomers.length === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>No data yet.</p>
                    ) : topCustomers.map((customer, i) => (
                      <div key={customer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < topCustomers.length - 1 ? '1px solid #F5EFF8' : 'none', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.8125rem', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.75rem', margin: 0 }}>{customer.orderCount} orders</p>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatCurrency(customer.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 14px' }}>Recent Signups</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {customerRecords.length === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8rem', margin: 0 }}>No signups yet.</p>
                    ) : [...customerRecords]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 4)
                      .map((customer, i, arr) => (
                        <div key={customer.id} style={{ padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #F5EFF8' : 'none' }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.8125rem', margin: '0 0 1px' }}>{customer.name}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.75rem', margin: 0 }}>Joined {formatShortDate(customer.createdAt)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── Reviews View ──────────────────────────────────────────── */}
        {activeView === 'reviews' && (
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-12 gap-6">
              {/* Left: vertical stat cards */}
              <aside className="col-span-12 md:col-span-3 flex flex-col gap-4">
                {[
                  { label: 'Total Reviews', value: allReviews.length.toString() },
                  { label: 'Avg Rating', value: allReviews.length > 0 ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : '—' },
                  { label: 'Replied', value: allReviews.filter((r) => r.admin_reply).length.toString() },
                  { label: 'Pending Reply', value: allReviews.filter((r) => !r.admin_reply).length.toString() },
                ].map((m) => (
                  <article key={m.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                    <p className="text-sm mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>{m.label}</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{m.value}</p>
                  </article>
                ))}
              </aside>

              {/* Right: reviews list */}
              <section className="col-span-12 md:col-span-9">
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ borderBottom: '1px solid #F3F0F7', padding: '16px 24px' }}>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>All Reviews</h3>
                  </div>

                  {reviewsLoading ? (
                    <div className="px-6 py-12 text-center" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Loading reviews…</div>
                  ) : allReviews.length === 0 ? (
                    <div className="px-6 py-12 text-center" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>No reviews yet.</div>
                  ) : (
                    <div>
                      {allReviews.map((review) => (
                        <div key={review.id} className="p-6 space-y-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
                      {/* Row top: product, customer, stars, date, delete */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>
                            {review.product_name || 'Unknown Product'}
                          </p>
                          <p className="text-xs" style={{ color: '#5B1E6E' }}>{review.user_name}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="h-4 w-4" fill={s <= review.rating ? '#C9A84C' : 'none'} style={{ color: s <= review.rating ? '#C9A84C' : '#E8D5F5' }} />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: '#5B1E6E' }}>
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDeleteReview(review.id)}
                            style={{ padding: '5px', borderRadius: '3px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#DC2626' }}
                            aria-label="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Comment */}
                      <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', lineHeight: '1.7' }}>{review.comment}</p>

                      {/* Existing admin reply */}
                      {review.admin_reply && replyingToId !== review.id && (
                        <div style={{ backgroundColor: '#F0E6F6', borderLeft: '3px solid #5B1E6E', borderRadius: '3px', padding: '14px 16px' }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A1060' }}>Your Reply</p>
                            <button
                              type="button"
                              onClick={() => { setReplyingToId(review.id); setReplyText(review.admin_reply ?? ''); }}
                              className="text-xs underline"
                              style={{ color: '#5B1E6E' }}
                            >Edit</button>
                          </div>
                          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', lineHeight: '1.65' }}>{review.admin_reply}</p>
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingToId === review.id ? (
                        <div className="space-y-3">
                          <textarea
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply to this review…"
                            className="w-full resize-none px-4 py-3 outline-none"
                            style={{ border: '2px solid #5B1E6E', borderRadius: '3px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', backgroundColor: '#FAF7FF', fontSize: '0.875rem' }}
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void handleSaveReply(review.id)}
                              disabled={!replyText.trim()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '3px', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}
                            >
                              <Reply className="h-4 w-4" />
                              Save Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingToId(null); setReplyText(''); }}
                              style={{ padding: '8px 18px', borderRadius: '3px', backgroundColor: '#F3F0F7', color: '#5B1E6E', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}
                            >Cancel</button>
                          </div>
                        </div>
                      ) : !review.admin_reply && (
                        <button
                          type="button"
                          onClick={() => { setReplyingToId(review.id); setReplyText(''); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '3px', backgroundColor: '#F0E6F6', color: '#5B1E6E', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Reply to Review
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
              </section>
            </div>
          </div>
        )}

        {/* ─── Inquiries (Contact Forms) View ───────────────────────────────────────── */}
        {activeView === 'inquiries' && (
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-12 gap-6">
              {/* Left: vertical stat cards */}
              <aside className="col-span-12 md:col-span-3 flex flex-col gap-4">
                {[
                  { label: 'Total Messages', value: contactMessages.length.toString() },
                  { label: 'Unread', value: contactMessages.filter((m) => !m.is_read).length.toString() },
                  { label: 'Read', value: contactMessages.filter((m) => m.is_read).length.toString() },
                  {
                    label: 'Today',
                    value: contactMessages.filter(
                      (m) => new Date(m.created_at).toDateString() === new Date().toDateString()
                    ).length.toString(),
                  },
                ].map((stat) => (
                  <article key={stat.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '18px 20px' }}>
                    <p className="text-sm mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>{stat.label}</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{stat.value}</p>
                  </article>
                ))}
              </aside>

              {/* Right: search + messages list */}
              <section className="col-span-12 md:col-span-9 flex flex-col gap-4">

            {/* Search bar */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 16px' }}>
              <input
                type="search"
                placeholder="Search by name, email, or subject…"
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="w-full"
                style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '8px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', backgroundColor: '#FAFAFA', fontSize: '0.875rem', outline: 'none', width: '100%' }}
                onFocus={(e) => { e.target.style.borderColor = '#5B1E6E'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            {/* Messages list */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ borderBottom: '1px solid #F3F0F7', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.0625rem', color: '#1A0A24', fontWeight: 600, margin: 0 }}>Contact Forms</h3>
                {unreadCount > 0 && (
                  <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {dataLoading ? (
                <div className="px-6 py-12 text-center" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>Loading messages…</div>
              ) : filteredMessages.length === 0 ? (
                <div className="px-6 py-12 text-center" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E' }}>
                  {messageSearchQuery ? 'No messages match your search.' : 'No contact messages yet.'}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="px-6 py-5 flex flex-wrap items-start justify-between gap-4 cursor-pointer transition-colors hover:bg-gray-50"
                      style={{ backgroundColor: msg.is_read ? '#FFFFFF' : '#FAFFF8' }}
                      onClick={() => void handleOpenMessage(msg)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') void handleOpenMessage(msg); }}
                      aria-label={`Open message from ${msg.name}: ${msg.subject}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {!msg.is_read && (
                            <Eye className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#5B1E6E' }} aria-hidden="true" />
                          )}
                          <span className="font-semibold text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{msg.name}</span>
                          <span className="text-xs" style={{ color: '#5B1E6E' }}>{msg.email}</span>
                          {!msg.is_read && (
                          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #A7F3D0' }}>New</span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}>{msg.subject}</p>
                        <p className="text-xs" style={{ color: '#5B1E6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '48ch' }}>
                          {msg.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs" style={{ color: '#5B1E6E' }}>
                          {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteMessage(msg.id); }}
                          style={{ padding: '5px', borderRadius: '3px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#DC2626' }}
                          aria-label={`Delete message from ${msg.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </section>
            </div>
          </div>
        )}

        {/* ─── Chat AI View ────────────────────────────────────────── */}
        {activeView === 'chatai' && (
          <div className="p-6 sm:p-8 space-y-6">
            {chatAiLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 animate-spin" style={{ border: '4px solid #E8D5F5', borderTopColor: '#5B1E6E', borderRadius: '50%' }} />
              </div>
            ) : (
              <>
                {/* Stats — single wide block */}
                <section style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '20px 24px' }}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Conversations', value: chatAiStats.total, icon: MessageSquare },
                      { label: "Today's Conversations", value: chatAiStats.today, icon: Calendar },
                      { label: 'Unique Users', value: chatAiStats.uniqueUsers, icon: Users },
                      { label: 'Product Queries', value: chatAiStats.productQueries, icon: Package },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '3px', backgroundColor: '#F0E6F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} style={{ color: '#5B1E6E' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9B8FAA', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>{label}</p>
                          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A0A24', margin: 0 }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Split view: Conversation History (left) + Intent Breakdown (right) */}
                <div className="grid grid-cols-12 gap-6">

                  {/* Left: Conversation History + search */}
                  <div className="col-span-12 lg:col-span-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Search above the list */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F0F7' }}>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 10px' }}>Conversation History</h3>
                      <input
                        type="search"
                        placeholder="Search conversations..."
                        value={chatLogSearch}
                        onChange={(e) => setChatLogSearch(e.target.value)}
                        style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '8px 14px', fontSize: '0.875rem', backgroundColor: '#FAFAFA', color: '#1A0A24', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%' }}
                      />
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#9B8FAA', margin: '6px 0 0' }}>{filteredChatLogs.length} of {chatLogs.length} conversations</p>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {filteredChatLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                          <Bot size={36} style={{ color: '#5B1E6E', opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#1A0A24', margin: '0 0 4px' }}>{chatLogs.length === 0 ? 'No conversations yet' : 'No matching conversations'}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#5B1E6E', margin: 0 }}>{chatLogs.length === 0 ? 'Chat logs will appear once customers use the AI assistant.' : 'Try a different search term.'}</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredChatLogs.map((log) => {
                            const badge = chatIntentStyle(log.intent);
                            return (
                              <div
                                key={log.id}
                                className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setSelectedChatLog(log)}
                              >
                                <div style={{ width: '30px', height: '30px', borderRadius: '3px', backgroundColor: '#F0E6F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                  {log.user_id ? <Users size={13} style={{ color: '#5B1E6E' }} /> : <Eye size={13} style={{ color: '#5B1E6E' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                                    <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#9B8FAA', fontFamily: 'Inter, sans-serif', marginLeft: 'auto' }}>{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', fontWeight: 500, color: '#1A0A24', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user_message}</p>
                                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#5B1E6E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.assistant_message}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteChatLog(log.id); }}
                                  style={{ padding: '4px', borderRadius: '3px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#DC2626', flexShrink: 0 }}
                                  aria-label="Delete log"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Intent Breakdown */}
                  <div className="col-span-12 lg:col-span-7" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8D5F5', borderRadius: '4px', padding: '20px 24px' }}>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1A0A24', fontWeight: 600, marginBottom: '20px' }}>Intent Breakdown</h3>
                    {chatLogs.length === 0 ? (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#5B1E6E', textAlign: 'center', padding: '32px 0' }}>No conversations logged yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Object.entries(intentCounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([intent, count]) => {
                            const style = chatIntentStyle(intent);
                            const pct = chatLogs.length > 0 ? Math.round((count / chatLogs.length) * 100) : 0;
                            return (
                              <div key={intent}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '3px', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}>{style.label}</span>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1A0A24', fontFamily: 'Inter, sans-serif' }}>{count} <span style={{ color: '#9B8FAA', fontWeight: 400 }}>({pct}%)</span></span>
                                </div>
                                <div style={{ height: '8px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#F0E6F6' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: style.color, opacity: 0.75, borderRadius: '3px', transition: 'width 0.4s' }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ─── Contact Message Detail Modal ─────────────────────────── */}
      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.4)', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: '640px', borderRadius: '4px', border: '1px solid #E8D5F5', padding: '28px 32px', backgroundColor: '#FFFFFF', boxShadow: '0 24px 80px rgba(26,10,36,0.18)', margin: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedMessage.subject}
                </h2>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.8125rem', margin: 0 }}>
                  {new Date(selectedMessage.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: 'transparent', cursor: 'pointer', color: '#6B4F7A', flexShrink: 0 }}
                aria-label="Close message"
              >
                <X size={14} />
              </button>
            </div>

            {/* Sender info */}
            <div style={{ backgroundColor: '#F0E6F6', borderRadius: '3px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '3px', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600, fontSize: '0.875rem', margin: '0 0 1px' }}>{selectedMessage.name}</p>
                  <a href={`mailto:${selectedMessage.email}`} style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontSize: '0.78rem', textDecoration: 'none' }}>{selectedMessage.email}</a>
                </div>
                {selectedMessage.is_read ? (
                  <span style={{ marginLeft: 'auto', display: 'inline-block', padding: '2px 9px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #A7F3D0' }}>Read</span>
                ) : (
                  <span style={{ marginLeft: 'auto', display: 'inline-block', padding: '2px 9px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>Unread</span>
                )}
              </div>
            </div>

            {/* Message body */}
            <div style={{ backgroundColor: '#FAF7FF', border: '1px solid #E8D5F5', borderRadius: '3px', padding: '16px 20px', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontSize: '0.875rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                {selectedMessage.message}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href={`mailto:${selectedMessage.email}?subject=Re%3A%20${encodeURIComponent(selectedMessage.subject)}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '3px', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
              >
                <Mail size={14} />
                Reply via Email
              </a>
              <button
                type="button"
                onClick={() => void handleDeleteMessage(selectedMessage.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '3px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
                Delete Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Chat Log Detail Modal ─────────────────────────────────── */}
      {selectedChatLog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.4)', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: '640px', borderRadius: '4px', border: '1px solid #E8D5F5', padding: '28px 32px', backgroundColor: '#FFFFFF', boxShadow: '0 24px 80px rgba(26,10,36,0.18)', margin: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {(() => { const b = chatIntentStyle(selectedChatLog.intent); return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', backgroundColor: b.bg, color: b.color, border: `1px solid ${b.border}` }}>{b.label}</span>; })()}
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#6B4F7A' }}>{selectedChatLog.user_id ? 'Logged in user' : 'Anonymous'}</span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#9B8FAA', margin: 0 }}>{new Date(selectedChatLog.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button type="button" onClick={() => setSelectedChatLog(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: 'transparent', cursor: 'pointer', color: '#6B4F7A', flexShrink: 0 }} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            {/* User message */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', margin: '0 0 8px' }}>User Message</p>
              <div style={{ backgroundColor: '#F0E6F6', border: '1px solid #E8D5F5', borderRadius: '3px', padding: '14px 18px' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#1A0A24', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{selectedChatLog.user_message}</p>
              </div>
            </div>

            {/* Assistant response */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9B8FAA', margin: '0 0 8px' }}>AI Response</p>
              <div style={{ backgroundColor: '#FAF7FF', border: '1px solid #E8D5F5', borderRadius: '3px', padding: '14px 18px' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#1A0A24', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{selectedChatLog.assistant_message}</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ marginBottom: '20px' }}>
              {[
                { label: 'Model', value: selectedChatLog.model_used },
                { label: 'Tools Used', value: selectedChatLog.tools_used.length > 0 ? selectedChatLog.tools_used.join(', ') : 'None' },
                { label: 'Intent', value: chatIntentStyle(selectedChatLog.intent).label },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#F0E6F6', borderRadius: '3px', padding: '10px 14px' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#5B1E6E', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#1A0A24', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => void handleDeleteChatLog(selectedChatLog.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '3px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}

      {editProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.4)', padding: '32px 16px' }}>
          <div
            className="w-full max-w-3xl"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8D5F5',
              borderRadius: '4px',
              padding: '28px 32px',
              margin: 'auto',
              boxShadow: '0 24px 80px rgba(26,10,36,0.18)',
            }}
          >
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#1A0A24', fontWeight: 600, margin: '0 0 4px' }}>
                  Edit Product
                </h3>
                <p style={{ fontFamily: 'Inter, sans-serif', color: '#9B8FAA', fontSize: '0.875rem', margin: 0 }}>
                  Update product information and save changes to Supabase.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                style={{ padding: '7px 16px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: 'transparent', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editProduct.name}
                    onChange={(e) => handleEditFieldChange('name', e.target.value)}
                    className="w-full"
                    style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editProduct.price}
                    onChange={(e) => handleEditFieldChange('price', e.target.value)}
                    className="w-full"
                    style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editProduct.stock}
                    onChange={(e) => handleEditFieldChange('stock', e.target.value)}
                    className="w-full"
                    style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  rows={5}
                  value={editProduct.description}
                  onChange={(e) => handleEditFieldChange('description', e.target.value)}
                  className="w-full"
                  style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none', resize: 'none' }}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                  Care Instructions
                </label>
                <textarea
                  rows={3}
                  value={editProduct.care}
                  onChange={(e) => handleEditFieldChange('care', e.target.value)}
                  placeholder="e.g. Keep away from water and chemicals. Store in a soft jewelry box."
                  className="w-full"
                  style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none', resize: 'none' }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#1A0A24', fontWeight: 600 }}>SEO &amp; Metadata</h3>
                  <button
                    type="button"
                    disabled={productSeoAiLoading}
                    onClick={() => {
                      if (!editProduct) return;
                      setProductSeoAiLoading(true);
                      const apiBase = import.meta.env.DEV ? 'http://localhost:3001' : '';
                      fetch(`${apiBase}/api/seo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          pageType: 'product',
                          name: editProduct.name,
                          description: editProduct.description,
                        }),
                      })
                        .then((r) => r.json())
                        .then((data: { title?: string; metaDescription?: string; keywords?: string[]; ogTitle?: string; ogDescription?: string }) => {
                          if (data.title) handleEditFieldChange('metaTitle', data.title);
                          if (data.metaDescription) handleEditFieldChange('metaDescription', data.metaDescription);
                          if (data.keywords?.length) handleEditFieldChange('metaKeywords', data.keywords.join(', '));
                          if (data.ogTitle) handleEditFieldChange('ogTitle', data.ogTitle);
                          if (data.ogDescription) handleEditFieldChange('ogDescription', data.ogDescription);
                          showSuccessToast('AI SEO generated', 'Review and save the product to apply.');
                        })
                        .catch(() => showErrorToast('AI generation failed', 'Please try again or enter manually.'))
                        .finally(() => setProductSeoAiLoading(false));
                    }}
                    className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ padding: '8px 16px', borderRadius: '3px', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 8px rgba(91,30,110,0.2)' }}
                  >
                    {productSeoAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {productSeoAiLoading ? 'Generating…' : 'Generate SEO with AI'}
                  </button>
                </div>
                  <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Slug</label>
                    <input type="text" value={editProduct.slug} onChange={(e) => handleEditFieldChange('slug', e.target.value)} placeholder="e.g. gold-plated-bracelet-women" className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Meta Title</label>
                    <input type="text" value={editProduct.metaTitle} onChange={(e) => handleEditFieldChange('metaTitle', e.target.value)} placeholder="Elegant Gold Ring | Bejeweled" className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Meta Description</label>
                    <textarea rows={3} value={editProduct.metaDescription} onChange={(e) => handleEditFieldChange('metaDescription', e.target.value)} placeholder="A short description for search engines..." className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none', resize: 'none' }} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>Meta Keywords</label>
                    <input type="text" value={editProduct.metaKeywords} onChange={(e) => handleEditFieldChange('metaKeywords', e.target.value)} placeholder="gold ring, necklace, bejeweled" className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>OG Title</label>
                    <input type="text" value={editProduct.ogTitle} onChange={(e) => handleEditFieldChange('ogTitle', e.target.value)} placeholder="e.g. Handcrafted Gold Bracelet – Luxury Jewelry at Bejeweled" className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>OG Description</label>
                    <textarea rows={2} value={editProduct.ogDescription} onChange={(e) => handleEditFieldChange('ogDescription', e.target.value)} placeholder="e.g. Shop our exclusive handcrafted jewelry — gold, diamonds, and pearls." className="w-full" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', outline: 'none', resize: 'none' }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                <div>
                  <label className="mb-2 block text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }}>
                    Add More Images
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleEditImageChange(e.target.files || [])}
                    className="block w-full"
                    style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24' }}
                  />
                </div>

                <label className="mt-8 flex items-center gap-3" style={{ border: '1px solid #E8D5F5', borderRadius: '3px', padding: '10px 14px', fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={editProduct.isFeatured}
                    onChange={(e) => handleEditFieldChange('isFeatured', e.target.checked)}
                  />
                  Featured
                </label>
              </div>

              {editImages.length > 0 && (
                <div>
                  <p className="mb-3 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 600 }}>
                    First image will be used as the main cover image.
                  </p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {editImages.map((image, index) => (
                      <div key={image.id} className="relative">
                        <img src={image.preview} alt={`${editProduct.name} ${index + 1}`} className="h-32 w-full object-cover" style={{ borderRadius: '3px', border: index === 0 ? '3px solid #5B1E6E' : '1px solid #E8D5F5' }} />
                        {index === 0 && (
                          <span style={{ position: 'absolute', left: '8px', top: '8px', display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            Cover
                          </span>
                        )}
                        {image.kind === 'new' && (
                          <span style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '0.72rem', backgroundColor: '#F0E6F6', color: '#1A0A24', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            New
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveEditImage(image.id)}
                          style={{ position: 'absolute', right: '8px', top: '8px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '3px', padding: '5px', border: 'none', cursor: 'pointer' }}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button type="button" onClick={() => handleMoveEditImage(index, index - 1)} disabled={index === 0} style={{ padding: '5px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', cursor: 'pointer', opacity: index === 0 ? 0.4 : 1 }} aria-label={`Move image ${index + 1} left`}>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => handleMoveEditImage(index, index + 1)} disabled={index === editImages.length - 1} style={{ padding: '5px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', cursor: 'pointer', opacity: index === editImages.length - 1 ? 0.4 : 1 }} aria-label={`Move image ${index + 1} right`}>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{ padding: '10px 22px', borderRadius: '3px', border: '1px solid #E8D5F5', backgroundColor: 'transparent', color: '#5B1E6E', fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProductActionPending}
                  style={{ padding: '10px 22px', borderRadius: '3px', border: 'none', backgroundColor: '#5B1E6E', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer', opacity: isProductActionPending ? 0.6 : 1 }}
                >
                  {isProductActionPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Add Coupon Modal ──────────────────────────────────────────────── */}
      <Dialog
        open={showAddCouponModal}
        onOpenChange={(open) => {
          if (!couponSubmitting) {
            setShowAddCouponModal(open);
            if (!open) resetCouponForm();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: '#FDFBF7',
            border: '1px solid #E8D5F5',
            borderRadius: '4px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#3D4F38', fontWeight: 700, fontSize: '1.2rem' }}>
              Create New Coupon
            </DialogTitle>
            <DialogDescription style={{ color: '#5B1E6E' }}>
              Fill in the details below. The coupon will be active immediately after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Discount Type — Radio Buttons */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold" style={{ color: '#1A0A24' }}>
                Discount Type <span style={{ color: '#DC2626' }}>*</span>
              </span>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#1A0A24', fontFamily: 'Inter, sans-serif' }}>
                  <input
                    type="radio"
                    value="percent"
                    checked={couponDiscountType === 'percent'}
                    onChange={() => { setCouponDiscountType('percent'); if (couponErrors.value) setCouponErrors(prev => ({ ...prev, value: '' })); }}
                    disabled={couponSubmitting}
                    style={{ accentColor: '#C9A84C' }}
                  />
                  Percentage Discount
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#1A0A24', fontFamily: 'Inter, sans-serif' }}>
                  <input
                    type="radio"
                    value="fixed"
                    checked={couponDiscountType === 'fixed'}
                    onChange={() => { setCouponDiscountType('fixed'); if (couponErrors.value) setCouponErrors(prev => ({ ...prev, value: '' })); }}
                    disabled={couponSubmitting}
                    style={{ accentColor: '#C9A84C' }}
                  />
                  Fixed Amount (PKR)
                </label>
              </div>
            </div>

            {/* Conditional Discount Value */}
            {couponDiscountType === 'percent' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="coupon-value" className="text-sm font-semibold" style={{ color: '#1A0A24' }}>
                  Discount Percentage (%) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="coupon-value"
                  type="number"
                  value={couponDiscountValue}
                  onChange={(e) => { setCouponDiscountValue(e.target.value); if (couponErrors.value) setCouponErrors(prev => ({ ...prev, value: '' })); }}
                  placeholder="e.g. 10"
                  min={1} max={100} step={1}
                  disabled={couponSubmitting}
                  className="w-full outline-none transition-all disabled:opacity-60"
                  style={{ border: couponErrors.value ? '1.5px solid #DC2626' : '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', fontWeight: 600, borderRadius: '3px', padding: '12px', fontSize: '0.875rem' }}
                />
                {couponErrors.value && <p className="text-xs" style={{ color: '#DC2626' }}>{couponErrors.value}</p>}
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Enter a value between 1 and 100.</p>
              </div>
            )}

            {couponDiscountType === 'fixed' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="coupon-value-fixed" className="text-sm font-semibold" style={{ color: '#1A0A24' }}>
                  Discount Amount (PKR) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="coupon-value-fixed"
                  type="number"
                  value={couponDiscountValue}
                  onChange={(e) => { setCouponDiscountValue(e.target.value); if (couponErrors.value) setCouponErrors(prev => ({ ...prev, value: '' })); }}
                  placeholder="e.g. 500"
                  min={1} step={0.01}
                  disabled={couponSubmitting}
                  className="w-full outline-none transition-all disabled:opacity-60"
                  style={{ border: couponErrors.value ? '1.5px solid #DC2626' : '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', fontWeight: 600, borderRadius: '3px', padding: '12px', fontSize: '0.875rem' }}
                />
                {couponErrors.value && <p className="text-xs" style={{ color: '#DC2626' }}>{couponErrors.value}</p>}
              </div>
            )}

            {/* 2-col grid: Coupon Code (full width), then Usage Limit */}
            <div className="grid grid-cols-2 gap-4">
              {/* Coupon Code — full width */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor="coupon-code" className="text-sm font-semibold" style={{ color: '#1A0A24' }}>
                  Coupon Code <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  ref={couponCodeRef}
                  id="coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(e) => { const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setCouponCode(val); if (couponErrors.code) setCouponErrors(prev => ({ ...prev, code: '' })); }}
                  placeholder="e.g. SAVE10"
                  maxLength={32}
                  disabled={couponSubmitting}
                  className="w-full outline-none transition-all disabled:opacity-60"
                  style={{ border: couponErrors.code ? '1.5px solid #DC2626' : '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', letterSpacing: '0.08em', fontWeight: 600, borderRadius: '3px', padding: '12px', fontSize: '0.875rem' }}
                />
                {couponErrors.code && <p className="text-xs" style={{ color: '#DC2626' }}>{couponErrors.code}</p>}
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Capital letters and numbers only. No spaces or symbols.</p>
              </div>

              {/* Usage Limit — single column */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor="coupon-limit" className="text-sm font-semibold" style={{ color: '#1A0A24' }}>
                  Usage Limit <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="coupon-limit"
                  type="number"
                  value={couponUsageLimit}
                  onChange={(e) => { setCouponUsageLimit(e.target.value); if (couponErrors.limit) setCouponErrors(prev => ({ ...prev, limit: '' })); }}
                  placeholder="e.g. 100"
                  min={1} step={1}
                  disabled={couponSubmitting}
                  className="w-full outline-none transition-all disabled:opacity-60"
                  style={{ border: couponErrors.limit ? '1.5px solid #DC2626' : '1px solid #E8D5F5', backgroundColor: '#FFFFFF', color: '#1A0A24', fontWeight: 600, borderRadius: '3px', padding: '12px', fontSize: '0.875rem' }}
                />
                {couponErrors.limit && <p className="text-xs" style={{ color: '#DC2626' }}>{couponErrors.limit}</p>}
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Maximum number of times this coupon can be used.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddCouponModal(false); resetCouponForm(); }}
              disabled={couponSubmitting}
              className="flex-1 sm:flex-none"
              style={{ padding: '9px 22px', borderRadius: '3px', border: 'none', backgroundColor: 'transparent', color: '#9B8FAA', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateCoupon}
              disabled={couponSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2"
              style={{ padding: '9px 22px', borderRadius: '3px', border: 'none', backgroundColor: '#C9A84C', color: '#0B0B0F', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.875rem', cursor: couponSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {couponSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Coupon
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}