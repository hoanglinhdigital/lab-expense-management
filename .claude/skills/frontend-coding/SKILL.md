---
name: frontend-coding
description: Quy tắc bắt buộc khi viết hoặc sửa bất kỳ code giao diện nào trong project lab-expense-management — React component, page, layout, form, bảng, chart, modal, tab bar, sidebar. Bao gồm bảng màu cố định, typography, icon lucide-react, responsive mobile-first, ngưỡng tách component và 3 trạng thái màn hình. Hãy dùng skill này bất cứ khi nào task chạm tới file .tsx trong src/app, dựng màn hình từ mockup, thêm/sửa UI, chỉnh style Tailwind, hoặc khi user nói "làm màn hình", "thêm nút", "sửa giao diện", "responsive", "component" — kể cả khi họ không nhắc tới design hay CSS.
---

# Frontend coding rules — lab-expense-management

Đây là app quản lý chi tiêu, dùng chủ yếu trên điện thoại. Người dùng mở app để nhập nhanh một khoản chi và xem tiền đang đi đâu. Vì vậy giao diện phải **nhất quán, đọc được số tiền trong một cái liếc, bấm trúng bằng ngón cái**. Các quy tắc dưới đây tồn tại để phục vụ ba điều đó — khi gặp tình huống không có trong tài liệu, hãy suy luận theo tinh thần này thay vì chế thêm quy ước mới.

## 1. Framework & styling

- Next.js App Router + TypeScript strict, React function component. Không dùng `pages/`, không dùng class component.
- Mặc định là Server Component. Chỉ thêm `'use client'` khi component thật sự cần state, effect hoặc event handler — càng ít client component, trang càng nhẹ.
- **Chỉ dùng Tailwind CSS utility class.** Không tạo file `.css` riêng và không tự chế class name. Toàn bộ style nằm cùng chỗ với markup thì người sau đọc một file là hiểu, không phải truy ngược sang stylesheet.
  - Nếu thật sự bắt buộc phải tự chế (ví dụ một `@keyframes` Tailwind không diễn đạt được), viết vào `src/app/globals.css` và **comment ngay phía trên nêu rõ lý do** để reviewer biết đây là ngoại lệ có chủ đích, không phải thói quen.
- Không dùng inline `style`, **trừ khi** giá trị chỉ tính được lúc runtime (chiều rộng thanh progress theo phần trăm, vị trí tooltip theo toạ độ chuột...). Giá trị tĩnh luôn có utility class tương ứng.
- Khi cần ghép class có điều kiện, ưu tiên biểu thức template rõ ràng hoặc helper `cn()` nếu project đã có. Đừng nối chuỗi class động kiểu `` `text-${color}-600` `` — Tailwind quét source tĩnh nên class đó sẽ bị loại khỏi bundle và mất màu ở production.

## 2. Bảng màu — chỉ dùng đúng các màu này

Bảng màu cố định để mọi màn hình trông như cùng một app. Đừng thêm màu mới; nếu thấy thiếu, hỏi user trước.

| Vai trò | Class |
|---|---|
| Primary / CTA | `bg-emerald-600` · hover `hover:bg-emerald-700` |
| Nền trang | `bg-slate-50` |
| Nền card | `bg-white` |
| Border | `border-slate-200` |
| Text chính | `text-slate-800` |
| Text phụ | `text-slate-500` |
| Income (thu nhập) | `text-emerald-600` |
| Expense (chi tiêu) | `text-rose-600` |
| Warning | `amber-500` |
| Danger | `rose-600` |
| Success | `emerald-600` |

Lưu ý về ngữ nghĩa: emerald vừa là màu thương hiệu vừa là màu "tiền vào". Trong ngữ cảnh tài chính, **income luôn emerald, expense luôn rose** — không đảo, không dùng đỏ/xanh khác, kể cả trong chart. Chart phải lấy đúng cặp màu này cho hai chuỗi dữ liệu thu/chi.

## 3. Font chữ & typography

- Dùng font mặc định của Next.js (Geist / system sans-serif) đã khai báo ở `src/app/layout.tsx`. **Không import font ngoài** — thêm font là thêm một round-trip mạng trên thiết bị di động, đổi lại gần như không được gì.

| Cấp | Class |
|---|---|
| Tiêu đề trang | `text-xl font-semibold` |
| Tiêu đề card | `text-base font-medium` |
| Nội dung | `text-sm` |
| Chú thích | `text-xs text-slate-500` |

- **Số tiền luôn `font-medium tabular-nums` và có phân cách hàng nghìn.** `tabular-nums` khiến mọi chữ số rộng bằng nhau, nên khi xếp chồng trong danh sách hay cột bảng thì các hàng đơn vị thẳng cột — mắt so sánh được ngay mà không cần đọc từng số.
- Định dạng số tiền qua một helper dùng chung (ví dụ `Intl.NumberFormat('vi-VN')`) chứ không tự nối chuỗi ở từng chỗ, để cả app hiển thị giống hệt nhau.
- Cột/ô chứa số tiền căn phải (`text-right`); text căn trái.

## 4. Icon & Emoji

- Icon giao diện **bắt buộc dùng `lucide-react`** — một bộ icon duy nhất thì nét vẽ, độ dày, tỉ lệ đồng nhất. Nếu package chưa có trong `package.json`, cài trước: `npm install lucide-react`.
- **Không dùng emoji làm icon chức năng** (nút, menu, tab, action). Emoji render khác nhau trên từng hệ điều hành và không đổi màu theo trạng thái, nên nút bấm sẽ lệch tông giữa iOS/Android/desktop.
- Emoji **chỉ** dùng làm biểu tượng của category do người dùng chọn — ví dụ 🍜 Ăn uống, 🚌 Đi lại. Đây là dữ liệu người dùng nhập, không phải phần tử giao diện.
- Kích thước icon chuẩn:

| Ngữ cảnh | Size |
|---|---|
| Trong nút và list item | `size={16}` |
| Tab bar | `size={20}` |
| Icon tiêu đề | `size={24}` |

- Icon đứng một mình trong nút phải có `aria-label`; icon đi kèm text đã có nghĩa thì đặt `aria-hidden`.

## 5. Responsive — mobile-first

- **Viết class cho mobile trước, rồi mới thêm `sm:` `md:` `lg:`.** Base class = mobile, không dùng `max-*`. Ví dụ: `flex flex-col md:flex-row`.
- **Mọi màn hình phải dùng tốt ở chiều rộng 375px** (iPhone SE). Kiểm tra: không tràn ngang, không chữ bị cắt, không phải cuộn ngang để đọc nội dung chính.
- Điều hướng: **mobile dùng bottom tab bar; từ `md:` trở lên chuyển sang sidebar bên trái.** Ví dụ khung sườn: tab bar `fixed bottom-0 md:hidden`, sidebar `hidden md:flex md:w-56`, và nội dung chừa `pb-16 md:pb-0` để tab bar không che.
- **Vùng bấm tối thiểu 44×44px** (`min-h-11 min-w-11`, hoặc padding đủ lớn). Icon 16px trong một nút 44px là đúng — phần dư là padding, không phải thừa. Ngón cái không bấm chính xác được hơn thế.
- Bảng dữ liệu rộng: trên mobile chuyển sang dạng danh sách card thay vì ép người dùng cuộn ngang.

## 6. Tách component

- Một khối UI lặp lại **từ 2 lần trở lên**, hoặc file page vượt **150 dòng** → tách thành component riêng. Hai ngưỡng này là mức mà file bắt đầu khó đọc và sửa một chỗ dễ quên chỗ kia.
- Component tái sử dụng đặt tại `/src/app/components/<TenComponent>.tsx`, tên **PascalCase**, trùng với tên file.
- Props khai báo bằng `interface` TypeScript rõ ràng, **không dùng `any`**. Đặt tên interface là `<TenComponent>Props`.
- Component nhận dữ liệu qua props và không tự fetch, trừ khi nó chính là ranh giới fetch của màn hình đó — như vậy nó mới dùng lại được ở chỗ khác.

```tsx
interface AmountBadgeProps {
  amount: number;
  type: 'income' | 'expense';
}

export function AmountBadge({ amount, type }: AmountBadgeProps) {
  return (
    <span
      className={`font-medium tabular-nums ${
        type === 'income' ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {formatCurrency(amount)}
    </span>
  );
}
```

## 7. Ba trạng thái màn hình

Mọi màn hình có tải dữ liệu phải xử lý đủ **loading / empty / error**. Bỏ sót thì người dùng gặp màn hình trắng và không biết app hỏng hay đang chạy.

- **Loading — skeleton**, không phải spinner giữa màn hình. Skeleton giữ nguyên bố cục nên nội dung hiện ra không làm nhảy trang. Dùng `bg-slate-200 animate-pulse` với đúng hình dạng của nội dung sắp có.
- **Empty — thông báo + gợi ý hành động.** Nói rõ vì sao trống và bước tiếp theo là gì, kèm CTA. "Chưa có khoản chi nào trong tháng này" + nút "Thêm khoản chi" — chứ không phải một chữ "No data".
- **Error — thông báo + nút thử lại.** Câu thông báo bằng tiếng Việt, dễ hiểu, không in stack trace ra UI. Nút thử lại phải gọi lại đúng thao tác vừa fail.

Phân biệt empty do chưa có dữ liệu và empty do bộ lọc không khớp — trường hợp sau nên gợi ý xoá bộ lọc thay vì tạo mới.

## Checklist trước khi báo hoàn thành

- [ ] Chỉ dùng Tailwind utility; không có file `.css` mới, không tự chế class (hoặc có comment giải thích ngoại lệ)
- [ ] Không có inline `style` tĩnh; class động không ghép chuỗi kiểu `text-${x}-600`
- [ ] Màu nằm trong bảng ở mục 2; income emerald, expense rose
- [ ] Typography đúng cấp; số tiền `font-medium tabular-nums` + phân cách hàng nghìn + căn phải
- [ ] Icon từ `lucide-react` đúng size (16/20/24); không có emoji làm icon chức năng
- [ ] Mobile-first, dùng tốt ở 375px, không cuộn ngang
- [ ] Bottom tab bar ở mobile / sidebar từ `md:`; vùng bấm ≥ 44×44px
- [ ] Khối lặp ≥ 2 lần hoặc page > 150 dòng đã được tách; props có `interface`, không `any`
- [ ] Đủ 3 trạng thái loading (skeleton) / empty (có CTA) / error (có nút thử lại)
- [ ] `npm run lint` và `npm run build` chạy sạch
