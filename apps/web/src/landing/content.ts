export const contactInfo = {
  phoneDisplay: "0916 697 533",
  phoneHref: "tel:+84916697533",
  zaloHref: "https://zalo.me/0916697533",
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=Gi%E1%BA%B7t+l%C3%A0+ZUZU+H%C3%A0+N%E1%BB%99i",
  address: "66 đường ven hồ Hạ Đình",
  hours: "Mở cửa từ 06:00 đến 22:00 hàng ngày",
} as const;

export const services = [
  {
    name: "Giặt sấy quần áo",
    description: "Đồ mặc hằng ngày được xử lý theo từng đơn và gấp gọn trước khi trả.",
    className: "laundry-service-main",
  },
  {
    name: "Chăn, ga, topper",
    description: "Đồ cồng kềnh có bảng giá riêng, ZUZU báo trước khi xử lý loại đặc biệt.",
    className: "laundry-service-soft",
  },
  {
    name: "Giặt khô",
    description: "Tiếp nhận riêng các món cần chăm sóc kỹ và xác nhận cách xử lý.",
    className: "laundry-service-line",
  },
  {
    name: "Giặt giày",
    description: "Tính theo đôi, phù hợp cho nhu cầu làm sạch định kỳ.",
    className: "laundry-service-dark",
  },
  {
    name: "Giao nhận đồ",
    description: "Liên hệ ZUZU để kiểm tra khu vực và thời gian giao nhận phù hợp.",
    className: "laundry-service-pickup",
  },
] as const;

export const prices = [
  { name: "Giặt thường", price: "từ 15.000đ/kg" },
  { name: "Giặt phân loại", price: "từ 17.000đ/kg" },
  { name: "Chăn thường", price: "từ 20.000đ/kg" },
  { name: "Chăn đặc biệt", price: "từ 25.000đ/kg" },
  { name: "Giặt khô", price: "60.000–80.000đ" },
  { name: "Giặt giày", price: "từ 50.000đ/đôi" },
  { name: "Topper", price: "từ 100.000đ/cái" },
] as const;

export const processSteps = [
  { number: "01", name: "Nhận đồ", detail: "Ghi nhận từng đơn" },
  { number: "02", name: "Giặt & xả", detail: "Xử lý phù hợp" },
  { number: "03", name: "Ủ thơm", detail: "Mùi thơm vừa đủ" },
  { number: "04", name: "Sấy & gấp", detail: "Khô và gọn gàng" },
  { number: "05", name: "Sẵn sàng nhận", detail: "Liên hệ khi xong" },
] as const;

export const trustPoints = [
  "Xử lý rõ từng đơn",
  "Theo dõi từng bước",
  "Gấp gọn trước khi trả",
  "Có hỗ trợ giao nhận",
] as const;
