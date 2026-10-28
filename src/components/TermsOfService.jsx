import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="bg-slate-900 text-white py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ea3838' }}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Lams<span style={{ color: '#ea3838' }}>Power</span>
              </h1>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Solar Energy Solutions</p>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-6">Terms of Service</h2>
          <p className="text-slate-400 mt-2 text-sm">Last Updated: <span className="text-white font-semibold">October 28, 2026</span></p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <p className="text-slate-700 text-base leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of the Lams Power website, product catalog,
            solar calculator, and any related services (collectively, the "Services") provided by <strong>Lams Power</strong>,
            a solar energy products company headquartered in Dhaka, Bangladesh.
          </p>
          <p className="text-slate-700 text-base leading-relaxed mt-4">
            By accessing our website or purchasing our products, you agree to be bound by these Terms. Please read them
            carefully before proceeding. If you do not agree to these Terms, you must not use our Services.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-slate-600 text-sm">
              <strong>Note:</strong> These Terms apply to all visitors, customers, resellers, and dealers who interact
              with Lams Power through our website, phone, WhatsApp, or in-person at our office.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            1. Acceptance of Terms
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            By using the Lams Power website or any of our Services, you confirm that:
          </p>
          <ul className="space-y-3">
            {[
              'You are at least 18 years of age or the legal age of majority in your jurisdiction.',
              'You have the legal capacity to enter into a binding agreement.',
              'You are not prohibited under any applicable law from using our Services.',
              'All information you provide to us is accurate, complete, and current.',
              'You agree to comply with these Terms and all applicable laws and regulations of Pakistan.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-slate-700 leading-relaxed mt-4">
            These Terms may be updated from time to time. Continued use of our Services after any changes constitutes
            your acceptance of the revised Terms.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            2. Use of Services
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            Our website and Services are provided for lawful commercial and personal use only. You agree to use our
            Services in accordance with these Terms and must not:
          </p>
          <ul className="space-y-3 mb-4">
            {[
              'Use the website for any unlawful, fraudulent, or harmful purpose.',
              'Reproduce, copy, or resell any part of our website content without prior written permission.',
              'Attempt to gain unauthorized access to any portion of our website, database, or admin systems.',
              'Transmit any unsolicited commercial communications (spam) through our contact forms.',
              'Use automated bots, scrapers, or crawlers to collect data from our product catalog.',
              'Misrepresent your identity or affiliation with any person or organization.',
              'Upload or transmit any malicious code, viruses, or harmful software.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-slate-700 leading-relaxed">
            Lams Power reserves the right to suspend or terminate your access to our Services at any time, without
            notice, if we determine that you have violated these Terms or engaged in conduct harmful to Lams Power
            or its customers.
          </p>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            3. Products & Pricing
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Product Availability</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Lams Power deals in a wide range of solar energy products including solar panels, on-grid and off-grid
                inverters, lithium and AGM batteries, mounting structures, solar cables, charge controllers, and
                related accessories. Product availability is subject to stock levels and supplier schedules. We do not
                guarantee that all products listed in our catalog are available at all times.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Pricing</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                All prices displayed on our website are in Pakistani Rupees (PKR) unless otherwise stated. Prices are
                subject to change without prior notice due to fluctuations in import duties, foreign exchange rates,
                manufacturer pricing, and market conditions. The price applicable to your order is the price confirmed
                at the time of order acceptance.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Taxes & Duties</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Displayed prices may or may not include applicable taxes (GST/Sales Tax). Any applicable taxes,
                import duties, or government levies will be clearly communicated at the time of quotation or invoicing.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Price Errors</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                In the event of a pricing error on our website or quotation, Lams Power reserves the right to cancel
                or decline orders placed at an incorrect price. We will notify you as soon as possible if such a
                situation arises and offer you the option to reorder at the correct price.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            4. Orders & Payments
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Order Confirmation</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Placing an order inquiry through our website, WhatsApp, or email does not constitute a confirmed order.
                An order is only confirmed when Lams Power issues a formal invoice or order confirmation and receives
                the agreed advance payment or deposit.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Payment Terms</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Standard payment terms require 100% advance payment for retail customers. For established dealers and
                distributors, credit terms may be arranged through a separate written agreement. We accept bank
                transfers, online payments, and cash payments at our office. All payments must clear before product
                dispatch unless credit terms have been agreed in writing.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Delivery</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Delivery timelines are estimated and may vary depending on stock availability, location, and logistics
                partners. Lams Power is not liable for delivery delays caused by courier companies, natural disasters,
                or other circumstances beyond our control. Delivery charges, if applicable, will be communicated at
                the time of order.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Order Cancellation</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Orders may be cancelled before dispatch subject to a cancellation charge if costs have been incurred.
                Once an order has been dispatched, it cannot be cancelled and the return/exchange policy will apply.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            5. Warranty & Returns
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Manufacturer Warranty</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Products sold by Lams Power carry the manufacturer's warranty as specified in the product documentation.
                Warranty terms vary by product category: solar panels typically carry 10–25 year performance warranties,
                inverters carry 2–5 year warranties, and batteries carry 1–3 year warranties. Specific warranty terms
                are provided with each product at the time of sale.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Warranty Claims</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                To make a warranty claim, you must provide the original invoice, product serial number, and a
                description of the defect. Warranty claims are subject to inspection and verification by Lams Power
                or the manufacturer's authorized service center. Warranty does not cover damage caused by improper
                installation, misuse, power surges not covered by appropriate surge protection, or physical damage.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Returns & Exchanges</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Returns are accepted within 7 days of delivery for products in original, unopened condition with all
                original packaging and documentation. Products that have been installed, used, or damaged after delivery
                cannot be returned unless covered under warranty. Shipping costs for returns are the customer's
                responsibility unless the product was delivered in a defective or incorrect condition.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Refunds</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Approved refunds will be processed within 7–14 business days via the original payment method. Lams
                Power reserves the right to deduct any applicable restocking fees from the refund amount.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            6. Intellectual Property
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            All content on the Lams Power website, including but not limited to text, graphics, logos, product images,
            data, software, and the overall design of the website, is the property of Lams Power or its content
            suppliers and is protected under applicable intellectual property laws.
          </p>
          <ul className="space-y-3">
            {[
              'You may not copy, reproduce, modify, distribute, or create derivative works from any website content without prior written permission from Lams Power.',
              'Product brand names, trademarks, and logos displayed on our website belong to their respective manufacturers and are used for identification purposes only.',
              'Unauthorized use of our intellectual property may constitute a violation of trademark, copyright, or other applicable laws.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Section 7 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            7. Limitation of Liability
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            To the maximum extent permitted by applicable law, Lams Power and its officers, employees, agents, and
            partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages
            arising from:
          </p>
          <ul className="space-y-3 mb-4">
            {[
              'Your use of or inability to use our website or Services.',
              'Any errors, omissions, or inaccuracies in product specifications, pricing, or availability.',
              'Unauthorized access to or alteration of your data or transmissions.',
              'Loss of profits, revenue, business, data, or goodwill resulting from the use of our products.',
              'Improper installation of products by third-party installers not affiliated with Lams Power.',
              'Damage resulting from power grid issues, lightning strikes, or extreme weather conditions.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-slate-600 text-sm">
              Our total liability in connection with any claim arising out of these Terms or our Services shall not
              exceed the amount paid by you for the specific product or service giving rise to the claim.
            </p>
          </div>
        </div>

        {/* Section 8 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            8. Disclaimer of Warranties
          </h3>
          <p className="text-slate-700 leading-relaxed">
            Our website, product catalog, and solar calculator tools are provided on an "as is" and "as available"
            basis without any warranties of any kind, express or implied, including but not limited to implied
            warranties of merchantability, fitness for a particular purpose, or non-infringement. Lams Power does
            not warrant that the website will be error-free, uninterrupted, or free of viruses or other harmful
            components. Results from our solar calculator tool are estimates only and should not be used as the
            sole basis for purchasing decisions. Always consult a qualified solar engineer for system design and
            sizing.
          </p>
        </div>

        {/* Section 9 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            9. Governing Law & Dispute Resolution
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the Islamic Republic of
            Pakistan. Any disputes arising out of or in connection with these Terms or our Services shall be subject
            to the exclusive jurisdiction of the courts of Dhaka, Bangladesh.
          </p>
          <p className="text-slate-700 leading-relaxed">
            We encourage you to contact us directly to resolve any disputes amicably before pursuing formal legal
            proceedings. Most issues can be resolved through good-faith communication with our customer support team.
          </p>
        </div>

        {/* Section 10 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            10. Privacy
          </h3>
          <p className="text-slate-700 leading-relaxed">
            Your privacy is important to us. Our collection and use of personal information in connection with your
            use of our Services is described in our{' '}
            <button
              onClick={() => navigate('/privacy-policy')}
              className="font-bold underline cursor-pointer"
              style={{ color: '#ea3838' }}
            >
              Privacy Policy
            </button>
            , which is incorporated into these Terms by reference. By using our Services, you consent to the
            collection and use of your information as described in the Privacy Policy.
          </p>
        </div>

        {/* Section 11 - Contact */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            11. Contact Information
          </h3>
          <p className="text-slate-300 leading-relaxed mb-6">
            If you have any questions about these Terms of Service, please contact us. We are happy to clarify
            any aspect of our terms or resolve any concerns you may have.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ea3838' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Company</p>
                <p className="text-white font-semibold">Lams Power — Solar Energy Solutions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ea3838' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Email</p>
                <a href="mailto:contact@lamspower.pro.bd" className="font-semibold hover:underline" style={{ color: '#ea3838' }}>
                  contact@lamspower.pro.bd
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ea3838' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Address</p>
                <p className="text-white font-semibold">1476, Alobdi Eidgah, Mirpur 12, Dhaka</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#ea3838' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 text-center text-xs py-6 mt-6">
        <p className="font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Lams Power. All Rights Reserved.
        </p>
        <p className="mt-1">1476, Alobdi Eidgah, Mirpur 12, Dhaka &nbsp;|&nbsp; contact@lamspower.pro.bd</p>
      </footer>

    </div>
  );
};

export default TermsOfService;
