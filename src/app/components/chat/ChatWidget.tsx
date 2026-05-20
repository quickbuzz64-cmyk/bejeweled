import { Fragment, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChat } from 'ai/react';
import { MessageCircle, X, Trash2, Send, User, Search, Package, ShoppingCart, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuthSession } from '../../lib/auth';
import { useCartStore } from '../../store/cartStore';
import { useChatStore } from '../../store/chatStore';
import { getSupabaseClient } from '../../lib/supabase';
import cozipLogo from '../../../../assets/bejeweled-web-logo.png';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConfirmRequest {
  question: string;
  pendingAction: Record<string, unknown>;
}

interface ProductResultItem {
  id: string;
  name: string;
  price: number;
  category: string | null;
  stock: number;
  image: string;
}

interface ProductResultGroup {
  id: string;
  products: ProductResultItem[];
  /** How many user messages had been sent when this group was created */
  afterUserMsgCount: number;
}

function ChatLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
  return (
    <img
      src={cozipLogo}
      alt="Bejeweled"
      style={{ width: dim, height: dim, borderRadius: '3px', objectFit: 'cover', border: '1px solid #E8D5F5', background: 'white', flexShrink: 0 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Quick-action chips shown when chat is empty
// ---------------------------------------------------------------------------
const QUICK_ACTIONS = [
  { label: 'Find Products', icon: Search, message: 'Show me some products you have available' },
  { label: 'Track Order', icon: Package, message: 'I want to track my order' },
  { label: 'View Cart', icon: ShoppingCart, message: 'What is currently in my cart?' },
  { label: 'Shipping Info', icon: HelpCircle, message: 'What are your shipping options and how long does delivery take?' },
];

// ---------------------------------------------------------------------------
// Status filler messages shown during latency gaps
// ---------------------------------------------------------------------------
const STATUS_FILLERS = [
  'Searching...',
  'Thinking...',
  'Looking that up...',
  'Checking for you...',
  'Working on it...',
];

// ---------------------------------------------------------------------------
// Typing indicator with rotating status text
// ---------------------------------------------------------------------------
function TypingIndicator({ status }: { status?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '12px' }}>
      <ChatLogo size="sm" />
      <div style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '3px', borderBottomLeftRadius: '0', padding: '10px 14px', boxShadow: '0 1px 4px rgba(91,30,110,0.08)' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#5B1E6E', display: 'block' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
          {status && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: '0.75rem', color: '#5B1E6E', marginLeft: '8px', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
            >
              {status}
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strip internal tags, reasoning, and noise from LLM output
// ---------------------------------------------------------------------------
function cleanResponse(text: string): string {
  return text
    .replace(/<\/?(?:response|thinking|reasoning|thought|internal|scratchpad)>/gi, '')
    .trim();
}

function isProductListText(text: string): boolean {
  const normalized = cleanResponse(text);
  return /\*\*.+\*\*\s*[-—]\s*Rs\s*\d+/i.test(normalized);
}

// ---------------------------------------------------------------------------
// Shared markdown components (defined once, reused everywhere)
// ---------------------------------------------------------------------------
const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p style={{ margin: '0 0 4px', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.6 }}>{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul style={{ paddingLeft: '16px', margin: '4px 0', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li style={{ marginBottom: '2px', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>{children}</li>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ background: 'rgba(91,30,110,0.08)', padding: '1px 4px', borderRadius: '2px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{children}</code>
  ),
};

// ---------------------------------------------------------------------------
// Adaptive-speed typewriter for streaming messages.
// ---------------------------------------------------------------------------
function StreamingText({ content, active }: { content: string; active: boolean }) {
  const cleaned = useMemo(() => cleanResponse(content), [content]);
  const [displayLen, setDisplayLen] = useState(() => (active ? 0 : cleaned.length));
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const contentRef = useRef(cleaned);
  contentRef.current = cleaned;

  const tick = useCallback((now: number) => {
    if (!lastRef.current) lastRef.current = now;
    const elapsed = now - lastRef.current;

    setDisplayLen((cur) => {
      const total = contentRef.current.length;
      if (cur >= total) return cur;

      const backlog = total - cur;
      const interval = backlog > 40 ? 4 : backlog > 15 ? 8 : 12;
      const chars = Math.floor(elapsed / interval);
      if (chars <= 0) return cur;

      lastRef.current = now;
      return Math.min(cur + chars, total);
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setDisplayLen(contentRef.current.length);
      return;
    }
    if (!rafRef.current) {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [active, tick]);

  const snapLen = useMemo(() => {
    if (displayLen >= cleaned.length) return cleaned.length;
    const slice = cleaned.slice(0, displayLen);
    const lastSpace = slice.lastIndexOf(' ');
    return lastSpace > displayLen - 8 ? lastSpace + 1 : displayLen;
  }, [displayLen, cleaned]);

  const visible = cleaned.slice(0, snapLen);

  return (
    <div className="chat-markdown">
      <ReactMarkdown components={MD_COMPONENTS}>{visible}</ReactMarkdown>
      {active && snapLen < cleaned.length && (
        <span style={{ display: 'inline-block', width: '2px', height: '1em', background: '#5B1E6E', verticalAlign: 'middle', marginLeft: '2px', animation: 'pulse 1s infinite' }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendered markdown for completed messages (no typewriter)
// ---------------------------------------------------------------------------
function FormattedMessage({ content }: { content: string }) {
  const cleaned = useMemo(() => cleanResponse(content), [content]);
  return (
    <div className="chat-markdown">
      <ReactMarkdown components={MD_COMPONENTS}>{cleaned}</ReactMarkdown>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation buttons (shown when agent needs user approval for cart actions)
// ---------------------------------------------------------------------------
interface ConfirmBannerProps {
  request: ConfirmRequest;
  onConfirm: () => void;
  onReject: () => void;
}

function ConfirmBanner({ request, onConfirm, onReject }: ConfirmBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{ margin: '0 12px 8px', borderRadius: '3px', border: '1px solid rgba(91,30,110,0.3)', background: '#F5F0FA', padding: '12px', boxShadow: '0 1px 6px rgba(91,30,110,0.08)' }}
    >
      <p style={{ fontSize: '0.875rem', color: '#1A0A24', fontWeight: 500, margin: '0 0 10px', fontFamily: 'Inter, sans-serif' }}>{request.question}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onConfirm}
          style={{ flex: 1, borderRadius: '3px', background: '#5B1E6E', color: 'white', fontSize: '0.8rem', fontWeight: 600, padding: '8px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          Confirm
        </button>
        <button
          onClick={onReject}
          style={{ flex: 1, borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', color: '#1A0A24', fontSize: '0.8rem', fontWeight: 500, padding: '8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ChatWidget
// ---------------------------------------------------------------------------
export function ChatWidget() {
  const { isOpen, openChat, closeChat, pendingMessage, clearPending } = useChatStore();
  const [hasUnread, setHasUnread] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [productGroups, setProductGroups] = useState<ProductResultGroup[]>([]);
  const [cartModalProduct, setCartModalProduct] = useState<ProductResultItem | null>(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  const processedFramesRef = useRef(0);

  const authSession = useAuthSession();
  const cartStore = useCartStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the actual supabase user id
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const chatApi = import.meta.env.DEV
    ? 'http://localhost:3001/api/chat'
    : '/api/chat';

  const cartItemIds = useMemo(
    () => cartStore.items.map((i) => i.id),
    [cartStore.items],
  );

  const { messages, input, setInput, handleSubmit, append, data, isLoading, setMessages } = useChat({
    api: chatApi,
    body: {
      userId,
      cartItemIds,
    },
    experimental_throttle: 50,
    onError: (e) => {
      const msg = e.message ?? '';
      if (msg.includes('Rate limit') || msg.includes('rate_limit') || msg.includes('429')) {
        toast.error('The AI assistant is temporarily busy. Please try again in a moment.');
      } else {
        toast.error('Assistant error: ' + msg);
      }
    },
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;
    if (processedFramesRef.current >= data.length) return;

    const newFrames = data.slice(processedFramesRef.current);
    processedFramesRef.current = data.length;

    for (const frame of newFrames) {
      const f = frame as Record<string, unknown>;
      if (f?.type === 'CART_UPDATED') {
        void cartStore.loadCart();
      }

      if (f?.type === 'PRODUCT_RESULTS' && Array.isArray(f.products)) {
        const products = (f.products as Record<string, unknown>[])
          .map((p) => ({
            id: String(p.id ?? ''),
            name: String(p.name ?? ''),
            price: Number(p.price ?? 0),
            category: (p.category == null ? null : String(p.category)),
            stock: Number(p.stock ?? 0),
            image: String(p.image ?? ''),
          }))
          .filter((p) => p.id && p.name);

        const afterUserMsgCount = messagesRef.current.filter((m) => m.role === 'user').length;

        setProductGroups((prev) => {
          const groupId = String(f.requestId ?? `${Date.now()}-${prev.length + 1}`);
          if (prev.some((g) => g.id === groupId)) return prev;
          return [...prev, { id: groupId, products, afterUserMsgCount }];
        });
      }
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) { setConfirmRequest(null); return; }

    const invocations = (lastAssistant as { toolInvocations?: { state: string; result: Record<string, unknown> }[] }).toolInvocations ?? [];
    const pending = invocations.find(
      (inv) => inv.state === 'result' && inv.result?.__event === 'CONFIRM_REQUIRED',
    );

    if (pending) {
      const res = pending.result as { question: string; pendingAction: Record<string, unknown> };
      setConfirmRequest({ question: res.question, pendingAction: res.pendingAction });
    } else {
      setConfirmRequest(null);
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && !isOpen) {
      setHasUnread(true);
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && pendingMessage) {
      void append({ role: 'user', content: pendingMessage });
      clearPending();
    }
  }, [isOpen, pendingMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  function sendQuickAction(message: string) {
    void append({ role: 'user', content: message });
  }

  function handleConfirm() {
    setConfirmRequest(null);
    void append({ role: 'user', content: 'Yes, please go ahead.' });
  }

  function handleReject() {
    setConfirmRequest(null);
    void append({ role: 'user', content: 'No, cancel that.' });
  }

  function clearChat() {
    setMessages([]);
    setConfirmRequest(null);
    setProductGroups([]);
    setCartModalProduct(null);
    setCartQuantity(1);
    processedFramesRef.current = 0;
  }

  async function handleAddToCartConfirm() {
    if (!cartModalProduct) return;

    try {
      await cartStore.addItem(cartModalProduct.id, cartQuantity, {
        name: cartModalProduct.name,
        price: cartModalProduct.price,
        image: cartModalProduct.image,
        stock: cartModalProduct.stock,
      });
      toast.success(`${cartModalProduct.name} added to cart`);
      setCartModalProduct(null);
      setCartQuantity(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add item to cart.';
      toast.error(message);
    }
  }

  const showQuickActions = messages.length === 0 && !isLoading;

  const lastMessage = messages[messages.length - 1];
  const lastContent = typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : '';
  const isThinking = isLoading && (
    lastMessage?.role !== 'assistant' || cleanResponse(lastContent).length === 0
  );

  const [fillerIdx, setFillerIdx] = useState(0);
  useEffect(() => {
    if (!isLoading) { setFillerIdx(0); return; }
    const t = setInterval(() => setFillerIdx((i) => (i + 1) % STATUS_FILLERS.length), 2000);
    return () => clearInterval(t);
  }, [isLoading]);

  useEffect(() => {
    if (isOpen) {
      fetch(chatApi, { method: 'OPTIONS' }).catch(() => {});
    }
  }, [isOpen, chatApi]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastContent, isThinking, confirmRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Floating trigger button                                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}>
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              key="trigger"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openChat()}
              aria-label="Open chat assistant"
              style={{ position: 'relative', width: 52, height: 52, borderRadius: '4px', background: '#5B1E6E', color: 'white', boxShadow: '0 4px 20px rgba(91,30,110,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MessageCircle size={24} />
              {hasUnread && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: '50%', background: '#C9A84C', border: '2px solid white' }} />
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ---------------------------------------------------------------- */}
        {/* Chat panel                                                        */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 380,
                maxWidth: 'calc(100vw - 24px)',
                height: 540,
                background: '#FAF7FF',
                borderRadius: '4px',
                boxShadow: '0 8px 40px rgba(26,10,36,0.2)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid #E8D5F5',
                transformOrigin: 'bottom right',
              }}
            >
              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#5B1E6E', color: 'white', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ChatLogo size="md" />
                  <div>
                    <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.9rem', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>Bejeweled Assistant</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.3 }}>
                      {authSession?.isAuthenticated
                        ? `Welcome back, ${authSession.firstName}`
                        : 'AI shopping helper'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={clearChat}
                    aria-label="Clear chat"
                    title="Clear chat"
                    style={{ padding: '6px', borderRadius: '3px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => closeChat()}
                    aria-label="Close chat"
                    style={{ padding: '6px', borderRadius: '3px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Messages ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                {/* Welcome message */}
                {messages.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                    <ChatLogo size="sm" />
                    <div style={{ background: 'white', border: '1px solid #E8D5F5', borderRadius: '3px', borderBottomLeftRadius: '0', padding: '12px 14px', boxShadow: '0 1px 4px rgba(91,30,110,0.08)', maxWidth: '85%' }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#1A0A24', margin: 0, lineHeight: 1.6 }}>
                        Hello{authSession?.isAuthenticated ? ` ${authSession.firstName}` : ''}. I am your Bejeweled shopping assistant. How can I help you today?
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick action chips */}
                {showQuickActions && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => sendQuickAction(action.message)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', color: '#5B1E6E', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, boxShadow: '0 1px 3px rgba(91,30,110,0.06)', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F3EEF8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                        >
                          <Icon size={12} />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Message list */}
                {(() => {
                  let userCount = 0;
                  return messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    if (isUser) userCount++;
                    const currentUserCount = userCount;

                    const isLastMsg = index === messages.length - 1;
                    const rawContent = typeof message.content === 'string'
                      ? message.content
                      : (message.content as { type: string; text?: string }[])
                          .filter((p) => p.type === 'text')
                          .map((p) => p.text)
                          .join('');

                    if (!isUser && !rawContent.trim()) return null;
                    if (!isUser && isProductListText(rawContent) && productGroups.length > 0) return null;

                    const msgGroups = !isUser
                      ? productGroups.filter((g) => g.afterUserMsgCount === currentUserCount)
                      : [];

                    return (
                      <Fragment key={message.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '12px', flexDirection: isUser ? 'row-reverse' : 'row' }}
                        >
                          {/* Role icon */}
                          <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isUser ? 'rgba(91,30,110,0.12)' : 'transparent', color: '#5B1E6E' }}>
                            {isUser ? <User size={12} /> : <ChatLogo size="sm" />}
                          </div>

                          {/* Bubble */}
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: '3px',
                              borderBottomRightRadius: isUser ? '0' : '3px',
                              borderBottomLeftRadius: isUser ? '3px' : '0',
                              fontSize: '0.875rem',
                              maxWidth: '80%',
                              boxShadow: '0 1px 4px rgba(91,30,110,0.08)',
                              lineHeight: 1.6,
                              background: isUser ? '#5B1E6E' : 'white',
                              color: isUser ? 'white' : '#1A0A24',
                              border: isUser ? 'none' : '1px solid #E8D5F5',
                              fontFamily: 'Inter, sans-serif',
                            }}
                          >
                            {isUser
                              ? <span style={{ whiteSpace: 'pre-wrap' }}>{rawContent}</span>
                              : isLoading && isLastMsg
                                ? <StreamingText content={rawContent} active />
                                : <FormattedMessage content={rawContent} />
                            }
                          </div>
                        </motion.div>

                        {/* Product cards */}
                        {msgGroups.map((group) => (
                          <motion.div
                            key={group.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}
                          >
                            <div style={{ flexShrink: 0, width: 22, height: 22 }}>
                              <ChatLogo size="sm" />
                            </div>

                            <div style={{ width: '100%', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {group.products.length === 0 ? (
                                <div style={{ padding: '12px 14px', borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', color: '#1A0A24', fontSize: '0.875rem', boxShadow: '0 1px 4px rgba(91,30,110,0.08)', fontFamily: 'Inter, sans-serif' }}>
                                  No matching products found right now.
                                </div>
                              ) : (
                                group.products.map((product) => (
                                  <div
                                    key={`${group.id}-${product.id}`}
                                    style={{ borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', boxShadow: '0 1px 6px rgba(91,30,110,0.08)', overflow: 'hidden' }}
                                  >
                                    <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
                                      <div style={{ width: 60, height: 60, borderRadius: '3px', background: '#F3ECF9', overflow: 'hidden', flexShrink: 0 }}>
                                        {product.image ? (
                                          <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A2891', fontSize: '0.7rem', fontFamily: 'Inter, sans-serif' }}>
                                            No image
                                          </div>
                                        )}
                                      </div>

                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.875rem', fontWeight: 600, color: '#1A0A24', margin: '0 0 4px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{product.name}</p>
                                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 700, color: '#5B1E6E', margin: 0 }}>Rs {product.price.toLocaleString('en-PK')}</p>
                                      </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 12px 12px' }}>
                                      <a
                                        href={`/product/${product.id}`}
                                        style={{ textAlign: 'center', borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', color: '#1A0A24', fontSize: '0.75rem', fontWeight: 500, padding: '7px', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
                                      >
                                        View Details
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCartModalProduct(product);
                                          setCartQuantity(1);
                                        }}
                                        disabled={product.stock <= 0}
                                        style={{ borderRadius: '3px', background: '#5B1E6E', color: 'white', fontSize: '0.75rem', fontWeight: 600, padding: '7px', border: 'none', cursor: product.stock <= 0 ? 'not-allowed' : 'pointer', opacity: product.stock <= 0 ? 0.4 : 1, fontFamily: 'Inter, sans-serif' }}
                                      >
                                        Add to Cart
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </Fragment>
                    );
                  });
                })()}

                {/* Typing indicator */}
                {isThinking && <TypingIndicator status={STATUS_FILLERS[fillerIdx]} />}

                <div ref={messagesEndRef} />
              </div>

              {/* Confirmation banner */}
              <AnimatePresence>
                {confirmRequest && (
                  <ConfirmBanner
                    request={confirmRequest}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                  />
                )}
              </AnimatePresence>

              {/* ── Input ── */}
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderTop: '1px solid #E8D5F5', background: 'white', flexShrink: 0 }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  style={{ flex: 1, fontSize: '0.875rem', background: '#F3EEF8', borderRadius: '3px', padding: '10px 14px', outline: 'none', border: '1px solid #E8D5F5', color: '#1A0A24', fontFamily: 'Inter, sans-serif', opacity: isLoading ? 0.6 : 1 }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                  style={{ width: 36, height: 36, borderRadius: '3px', background: '#5B1E6E', color: 'white', border: 'none', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isLoading || !input.trim() ? 0.4 : 1, transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { if (!isLoading && input.trim()) e.currentTarget.style.background = '#3B0D4A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#5B1E6E'; }}
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cart quantity modal ── */}
        <AnimatePresence>
          {isOpen && cartModalProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '12px' }}
            >
              <motion.div
                initial={{ y: 20, scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.96 }}
                style={{ width: '100%', maxWidth: 360, borderRadius: '4px', background: 'white', border: '1px solid #E8D5F5', boxShadow: '0 8px 40px rgba(26,10,36,0.2)', padding: '16px' }}
              >
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.9rem', fontWeight: 600, color: '#1A0A24', margin: '0 0 4px' }}>Add to Cart</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#6B4F7A', margin: '0 0 16px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{cartModalProduct.name}</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#6B4F7A' }}>Quantity</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCartQuantity((q) => Math.max(1, q - 1))}
                      style={{ width: 30, height: 30, borderRadius: '3px', border: '1px solid #E8D5F5', color: '#1A0A24', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
                    >
                      &minus;
                    </button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: '#1A0A24' }}>{cartQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setCartQuantity((q) => Math.min(cartModalProduct.stock || 1, q + 1))}
                      style={{ width: 30, height: 30, borderRadius: '3px', border: '1px solid #E8D5F5', color: '#1A0A24', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}
                    >
                      &#43;
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCartModalProduct(null);
                      setCartQuantity(1);
                    }}
                    style={{ borderRadius: '3px', background: 'white', border: '1px solid #E8D5F5', color: '#1A0A24', fontSize: '0.875rem', fontWeight: 500, padding: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleAddToCartConfirm(); }}
                    style={{ borderRadius: '3px', background: '#5B1E6E', color: 'white', fontSize: '0.875rem', fontWeight: 600, padding: '10px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
