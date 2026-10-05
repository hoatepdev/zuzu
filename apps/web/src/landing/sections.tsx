import {
  CheckOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  contactInfo,
  prices,
  processSteps,
  services,
  trustPoints,
} from "./content";

export function ContactActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`landing-actions ${compact ? "landing-actions-compact" : ""}`}>
      <a className="landing-button landing-button-primary" href={contactInfo.phoneHref}>
        <PhoneOutlined aria-hidden="true" />
        Gọi cho ZUZU
      </a>
      <a
        className="landing-button landing-button-secondary"
        href={contactInfo.zaloHref}
        target="_blank"
        rel="noreferrer"
      >
        <SendOutlined aria-hidden="true" />
        Nhắn Zalo
      </a>
    </div>
  );
}

export function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-copy">
        <p className="landing-kicker">GIẶT LÀ ZUZU</p>
        <h1 id="landing-title">
          Sạch thơm. Gọn gàng.
          <span>Bạn chỉ việc mang đồ về.</span>
        </h1>
        <p className="landing-hero-lead">
          Giặt sấy quần áo, chăn ga, giặt khô và giày.
        </p>
        <ContactActions />
      </div>

      <div className="landing-hero-visual">
        <img
          className="landing-mascot"
          src="/mascot.png"
          alt="Gấu ZUZU, linh vật của tiệm giặt là"
          width="640"
          height="640"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section className="landing-section landing-services" id="dich-vu" aria-labelledby="services-title">
      <div className="landing-section-heading">
        <h2 id="services-title">ZUZU giặt gì?</h2>
        <p>Từ đồ mặc mỗi ngày đến những món cần chăm sóc riêng.</p>
      </div>
      <div className="landing-service-composition">
        {services.map((service, index) => (
          <article className={service.className} key={service.name}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section className="landing-section landing-pricing" id="bang-gia" aria-labelledby="pricing-title">
      <div className="landing-price-intro">
        <h2 id="pricing-title">
          Giá đơn giản,
          <span>không phải đoán.</span>
        </h2>
        <p>Mức giá tham khảo để bạn dễ ước tính trước khi mang đồ tới ZUZU.</p>
      </div>
      <div className="landing-price-board">
        <div className="landing-price-board-head" aria-hidden="true">
          <span>Dịch vụ</span>
          <span>Giá tham khảo</span>
        </div>
        <dl>
          {prices.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd>{item.price}</dd>
            </div>
          ))}
        </dl>
        <p className="landing-price-note">
          Một số loại đồ đặc biệt sẽ được ZUZU báo giá trước khi xử lý.
        </p>
      </div>
    </section>
  );
}

export function Process() {
  return (
    <section className="landing-section landing-process" id="quy-trinh" aria-labelledby="process-title">
      <div className="landing-section-heading">
        <h2 id="process-title">Đồ của bạn đi đâu sau khi gửi ZUZU?</h2>
      </div>
      <ol className="landing-process-list">
        {processSteps.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <strong>{step.name}</strong>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrustAndGallery() {
  return (
    <section className="landing-section landing-trust" aria-labelledby="trust-title">
      <div className="landing-trust-copy">
        <h2 id="trust-title">Mỗi túi đồ, một hành trình rõ ràng.</h2>
        <ul>
          {trustPoints.map((point) => (
            <li key={point}>
              <CheckOutlined aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="landing-gallery" aria-labelledby="gallery-title">
        <h3 id="gallery-title">Một góc nhỏ của ZUZU</h3>
        <div className="landing-gallery-grid">
          <figure className="landing-photo landing-photo-storefront">
            <img
              src="/storefront.jpg"
              alt="Mặt tiền cửa hàng Giặt là ZUZU"
              width="1400"
              height="1050"
              loading="lazy"
            />
          </figure>
          <div className="landing-photo-placeholder landing-photo-machines" role="img" aria-label="Vị trí ảnh khu máy giặt và máy sấy">
            <span>Khu giặt sấy</span>
          </div>
          <div className="landing-photo-placeholder landing-photo-folded" role="img" aria-label="Vị trí ảnh đồ đã được gấp gọn">
            <span>Đồ đã gấp</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Reviews() {
  return (
    <section className="landing-section landing-reviews" aria-labelledby="reviews-title">
      <div>
        <h2 id="reviews-title">Khách nói gì về ZUZU</h2>
        <p>ZUZU không đăng lời khen chưa được xác thực. Xem thông tin cửa hàng trực tiếp trên Google Maps.</p>
      </div>
      <a href={contactInfo.mapsHref} target="_blank" rel="noreferrer">
        Xem ZUZU trên Google Maps
        <EnvironmentOutlined aria-hidden="true" />
      </a>
    </section>
  );
}

export function Location() {
  return (
    <section className="landing-section landing-location" id="cua-hang" aria-labelledby="location-title">
      <div className="landing-location-title">
        <h2 id="location-title">Ghé ZUZU nhé.</h2>
        <p>Mang đồ tới cửa hàng hoặc liên hệ trước để hỏi về giao nhận.</p>
      </div>
      <div className="landing-location-details">
        <strong>Giặt là ZUZU</strong>
        <address>{contactInfo.address}</address>
        <p>{contactInfo.hours}</p>
        <a className="landing-phone" href={contactInfo.phoneHref}>
          Hotline/Zalo: {contactInfo.phoneDisplay}
        </a>
      </div>
      <div className="landing-location-actions">
        <a className="landing-button landing-button-primary" href={contactInfo.mapsHref} target="_blank" rel="noreferrer">
          <EnvironmentOutlined aria-hidden="true" />
          Chỉ đường
        </a>
        <a className="landing-button landing-button-quiet" href={contactInfo.phoneHref}>
          <PhoneOutlined aria-hidden="true" />
          Gọi ngay
        </a>
        <a className="landing-button landing-button-quiet" href={contactInfo.zaloHref} target="_blank" rel="noreferrer">
          <SendOutlined aria-hidden="true" />
          Nhắn Zalo
        </a>
      </div>
    </section>
  );
}

export function MobileActions() {
  return (
    <nav className="landing-mobile-actions" aria-label="Liên hệ nhanh">
      <a href={contactInfo.phoneHref}>
        <PhoneOutlined aria-hidden="true" />
        <span>Gọi</span>
      </a>
      <a href={contactInfo.zaloHref} target="_blank" rel="noreferrer">
        <SendOutlined aria-hidden="true" />
        <span>Zalo</span>
      </a>
      <a href={contactInfo.mapsHref} target="_blank" rel="noreferrer">
        <EnvironmentOutlined aria-hidden="true" />
        <span>Chỉ đường</span>
      </a>
    </nav>
  );
}
