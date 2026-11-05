import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import { BANK_ID, ACCOUNT_NO, ACCOUNT_NAME } from '../constants/payment.js';
import { copyTextToClipboard } from '../utils/vocabulary-ai-prompt.js';
import useUserPlan from '../hooks/useUserPlan.js';
import usePaymentOrders from '../hooks/usePaymentOrders.js';

const WORD_PACKAGES = [
  { amount: 10000, words: 500, label: '10k' },
  { amount: 15000, words: 1000, label: '15k', badge: 'Phổ biến nhất' },
  { amount: 22000, words: 2000, label: '22k' },
  { amount: 33000, words: 3000, label: '33k' },
  { amount: 44000, words: 5000, label: '44k' },
  { amount: 55000, words: 8000, label: '55k', badge: 'Tiết kiệm nhất' },
];

export default function UpgradeModal({ open, isOpen, onClose }) {
  const visible = open ?? isOpen ?? false;
  const { user, shortUserId, refetchPlan } = useUserPlan();
  const { orders, loading: ordersLoading, createOrder, fetchOrders } = usePaymentOrders();

  const [mainTab, setMainTab] = useState('packages');
  const [selected, setSelected] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const handledOrderRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setMainTab('packages');
      setSelected(null);
      setCurrentOrder(null);
      setSuccessMsg('');
      setToast('');
    }
  }, [visible]);

  useEffect(() => {
    if (mainTab === 'history') fetchOrders();
  }, [mainTab, fetchOrders]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCopy = async (text, msg) => {
    const ok = await copyTextToClipboard(text);
    setToast(ok ? msg : 'Không thể sao chép, hãy copy thủ công.');
  };

  const handlePay = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const order = await createOrder({
        packageType: 'quota',
        packageDetail: `+${selected.words} từ`,
        amount: selected.amount,
      });
      setCurrentOrder(order);
    } catch (e) {
      setToast('Không thể tạo đơn, vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!currentOrder?.id) return;
    const channel = supabase
      .channel(`payment_order_${currentOrder.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_orders', filter: `id=eq.${currentOrder.id}` },
        (payload) => {
          const updated = payload.new;
          setCurrentOrder(updated);
          if (updated.status === 'completed' && handledOrderRef.current !== updated.id) {
            handledOrderRef.current = updated.id;
            handleOrderCompleted(updated);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrder?.id]);

  const handleOrderCompleted = async (order) => {
    if (!user?.id || order.package_type !== 'quota') return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('word_quota')
        .eq('id', user.id)
        .maybeSingle();
      let words = selected?.words ?? 0;
      if (!selected) {
        const detail = String(order.package_detail || '');
        words = parseInt(detail.replace(/[^\d]/g, ''), 10) || 0;
      }
      const newQuota = (profile?.word_quota ?? 500) + words;
      await supabase.from('profiles').update({ word_quota: newQuota }).eq('id', user.id);
      await refetchPlan?.();
      setSuccessMsg('Nạp thành công!');
    } catch (e) {
      setToast('Lỗi đồng bộ dữ liệu.');
    }
  };

  const isExpired = (order) => {
    if (!order) return false;
    if (order.status !== 'pending') return order.status === 'expired';
    const created = new Date(order.created_at).getTime();
    return Date.now() - created > 24 * 60 * 60 * 1000;
  };

  const statusLabel = (order) => {
    const st = isExpired(order) ? 'expired' : order.status;
    if (st === 'completed') return 'Hoàn thành';
    if (st === 'expired') return 'Hết hạn';
    return 'Chờ thanh toán';
  };

  const viewOrderQR = (order) => {
    setCurrentOrder(order);
    setMainTab('packages');
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }} role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl bg-surface-sidebar shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-color px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Mở rộng dung lượng</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Đóng">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 pt-4">
          <div className="flex gap-2 rounded-lg bg-surface-default p-1">
            <button type="button" onClick={() => { setMainTab('packages'); setCurrentOrder(null); setSuccessMsg(''); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mainTab === 'packages' ? 'bg-brand-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>Chọn gói</button>
            <button type="button" onClick={() => { setMainTab('history'); setCurrentOrder(null); setSuccessMsg(''); }} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mainTab === 'history' ? 'bg-brand-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>Lịch sử nạp</button>
          </div>
        </div>
        <div className="p-5">
          {successMsg ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">🎉</div>
              <p className="text-lg font-semibold text-text-primary">{successMsg}</p>
              <button type="button" onClick={() => { setSuccessMsg(''); setCurrentOrder(null); }} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white">Đóng</button>
            </div>
          ) : currentOrder ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${currentOrder.amount}&addInfo=${encodeURIComponent(currentOrder.order_code)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`}
                alt="VietQR"
                className="h-56 w-56 rounded-lg border border-border-color bg-white object-contain"
              />
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-default px-3 py-2">
                  <span className="truncate text-text-secondary">Mã đơn: <span className="font-medium text-text-primary">{currentOrder.order_code}</span></span>
                  <button type="button" onClick={() => handleCopy(currentOrder.order_code, 'Đã sao chép mã đơn')} className="rounded-md bg-brand-primary px-2 py-1 text-xs font-medium text-white">Sao chép cú pháp</button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-default px-3 py-2">
                  <span className="truncate text-text-secondary">STK: <span className="font-medium text-text-primary">{ACCOUNT_NO}</span></span>
                  <button type="button" onClick={() => handleCopy(ACCOUNT_NO, 'Đã sao chép số tài khoản')} className="rounded-md bg-brand-primary px-2 py-1 text-xs font-medium text-white">Sao chép số tài khoản</button>
                </div>
              </div>
              <p className="text-xs text-text-secondary">Hệ thống sẽ kích hoạt dung lượng sau khi xác nhận chuyển khoản thành công.</p>
              <button type="button" onClick={() => setCurrentOrder(null)} className="text-sm text-text-secondary underline">Quay lại</button>
            </div>
          ) : mainTab === 'history' ? (
            <div className="upgrade-history-scrollbar max-h-[60vh] space-y-2 overflow-y-auto pr-2">
              {ordersLoading ? (
                <div className="py-8 text-center text-sm text-text-secondary">Đang tải...</div>
              ) : orders.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-secondary">Chưa có giao dịch nào.</div>
              ) : (
                <ul className="space-y-2">
                  {orders.filter((order) => order.package_type === 'quota').map((order) => (
                    <li key={order.id} className="rounded-xl border border-border-color bg-surface-default p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">{order.order_code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isExpired(order) ? 'bg-gray-200 text-gray-600' : order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {statusLabel(order)}
                        </span>
                      </div>
                      <div className="mt-1 text-text-secondary">
                        {order.package_detail} — {Number(order.amount).toLocaleString('vi-VN')}đ
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </div>
                      {order.status === 'pending' && !isExpired(order) && (
                        <button type="button" onClick={() => viewOrderQR(order)} className="mt-2 rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white">
                          Xem lại mã QR
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {WORD_PACKAGES.map((pkg, idx) => {
                  const isActive = selected && selected.amount === pkg.amount;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelected(pkg)}
                      aria-pressed={Boolean(isActive)}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-2 border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/20'
                          : 'border-border-color bg-surface-default hover:border-brand-primary/50 hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-text-primary">+{pkg.words.toLocaleString('vi-VN')} từ</span>
                            {pkg.badge && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                pkg.words === 1000
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          <span className="mt-1 block text-xs text-text-secondary">Sử dụng vĩnh viễn</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-medium text-brand-primary">{pkg.label}</span>
                          {isActive && (
                            <svg className="h-5 w-5 text-brand-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.3 9.18a1 1 0 0 1 1.4-1.428l4.08 4.002 6.51-6.458a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={!selected || creating}
                className="w-full rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? 'Đang tạo đơn...' : 'Xác nhận & Tiến hành'}
              </button>
            </div>
          )}
        </div>
        {toast && <div className="px-5 pb-4"><div className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white">{toast}</div></div>}
      </div>
    </div>
  );
}
