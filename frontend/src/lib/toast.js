/**
 * ============================================================
 * 🍞 TOAST THỐNG NHẤT TOÀN ỨNG DỤNG
 * ============================================================
 * Tất cả trang frontend dùng chung 1 cơ chế toast (sonner).
 * Gọi showToast(message, type) bất cứ đâu — 1 phong cách nhất quán.
 *
 *   showToast("Đã lưu!")                    // success (mặc định)
 *   showToast("Có lỗi!", "error")           // error
 *   showToast("Đang tải...", "loading")     // loading (tự ẩn sau 2s)
 *   showToast("Thông tin", "info")
 * ============================================================
 */
import { toast } from "sonner";

const TYPE_MAP = {
  success: toast.success,
  error: toast.error,
  info: toast.info,
  warning: toast.warning,
  loading: (msg) => toast.loading(msg, { duration: 2000 }),
};

export function showToast(message, type = "success") {
  const fn = TYPE_MAP[type] || toast.success;
  fn(message);
}

export { toast };
export default showToast;
