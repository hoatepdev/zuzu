import { contactInfo } from "./content";
import {
  Hero,
  Location,
  MobileActions,
  Pricing,
  Process,
  Reviews,
  Services,
  TrustAndGallery,
} from "./sections";
import "./landing.css";

function Wordmark() {
  return (
    <span className="landing-wordmark">
      <img src="/logo.png" alt="Giặt là ZUZU" width="640" height="427" />
    </span>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#noi-dung-chinh">
        Bỏ qua điều hướng
      </a>
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <a href="#top" aria-label="ZUZU, về đầu trang">
            <Wordmark />
          </a>
          <nav aria-label="Điều hướng trang">
            <a href="#dich-vu">Dịch vụ</a>
            <a href="#bang-gia">Bảng giá</a>
            <a href="#quy-trinh">Quy trình</a>
            <a href="#cua-hang">Cửa hàng</a>
          </nav>
          <a className="landing-header-cta" href={contactInfo.phoneHref}>
            Liên hệ
          </a>
        </div>
      </header>

      <main id="noi-dung-chinh">
        <div className="landing-container" id="top">
          <Hero />
          <Services />
          <Pricing />
          <Process />
          <TrustAndGallery />
          <Reviews />
          <Location />
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div>
            <Wordmark />
            <p>Sạch thơm. Gọn gàng. Dễ dàng.</p>
          </div>
          <nav aria-label="Điều hướng cuối trang">
            <a href="#dich-vu">Dịch vụ</a>
            <a href="#bang-gia">Bảng giá</a>
            <a href="#cua-hang">Cửa hàng</a>
            <a href={contactInfo.phoneHref}>Liên hệ</a>
          </nav>
          <small>© {new Date().getFullYear()} ZUZU</small>
        </div>
      </footer>
      <MobileActions />
    </div>
  );
}
