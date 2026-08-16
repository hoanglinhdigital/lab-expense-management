/**
 * Options dùng chung cho mọi script test.
 *
 * Đây là bộ test chức năng chứ không phải test tải: đúng 1 VU chạy 1 vòng, theo
 * thứ tự tuần tự — các module dùng chung dữ liệu thật nên chạy song song sẽ sai.
 *
 * Threshold `checks: rate==1.00` là thứ thay cho `process.exit()` của runner cũ:
 * chỉ cần một case fail, `k6 run` trả exit code 99 nên CI bắt được.
 */

export const baseOptions = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ["rate==1.00"],
    // Lỗi mạng / server chết mới tính là request hỏng; các case 4xx mong đợi đã
    // được loại trừ bằng `setResponseCallback` trong `lib/http.js`.
    http_req_failed: ["rate==0"],
  },
  // Test chức năng không quan tâm phân vị thời gian đáp ứng.
  summaryTrendStats: ["avg", "max"],
};

/** Ghép thêm option riêng của từng script (nếu cần) vào bộ dùng chung. */
export function withOptions(extra = {}) {
  return { ...baseOptions, ...extra };
}
