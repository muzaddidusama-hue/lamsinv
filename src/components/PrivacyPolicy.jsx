import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14.93V17a1 1 0 112 0v-.07A8.001 8.001 0 0112 4a8 8 0 010 12.93zM11 8a1 1 0 112 0v5a1 1 0 11-2 0V8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Lams<span style={{ color: '#ea3838' }}>Power</span>
              </h1>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Solar Energy Solutions</p>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-6">Privacy Policy</h2>
          <p className="text-slate-400 mt-2 text-sm">Last Updated: <span className="text-white font-semibold">October 28, 2026</span></p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <p className="text-slate-700 text-base leading-relaxed">
            Welcome to <strong>Lams Power</strong>. We are a solar energy products company based in Dhaka, Bangladesh,
            committed to providing high-quality solar panels, inverters, batteries, and energy solutions to homes and
            businesses across Pakistan and Bangladesh. This Privacy Policy explains how we collect, use, disclose, and
            protect your personal information when you visit our website, browse our product catalog, or contact us
            regarding our services.
          </p>
          <p className="text-slate-700 text-base leading-relaxed mt-4">
            By using our website or services, you agree to the terms described in this Privacy Policy. If you do not
            agree, please discontinue use of our website.
          </p>
        </div>

        {/* Section 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            1. Information We Collect
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            We collect information that you voluntarily provide to us and information that is automatically gathered
            when you interact with our website. The types of information we may collect include:
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">a) Personal Identification Information</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Name, email address, phone number, postal address, and other contact details you provide when submitting
                an inquiry form, requesting a quotation, or contacting our support team.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">b) Business Information</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Company name, NTN/STRN number, business address, and purchase volumes when you apply to become a
                reseller, dealer, or distributor of Lams Power products.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">c) Browsing & Usage Data</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                IP address, browser type, device information, pages visited on our product catalog, time spent on pages,
                referral URLs, and clickstream data. This data is collected automatically when you browse our website.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">d) Communication Records</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Records of correspondence when you contact us via email, WhatsApp, phone, or our website contact form,
                including any attachments or documents you may share with us.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            2. How We Use Your Information
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            Lams Power uses the information we collect for legitimate business purposes, including:
          </p>
          <ul className="space-y-3">
            {[
              'To respond to your product inquiries, quotation requests, and customer support queries.',
              'To process and fulfill your orders for solar panels, inverters, batteries, and other energy products.',
              'To send you order confirmations, invoices, warranties, and delivery updates.',
              'To provide you with information about new products, promotions, and special offers from Lams Power (with your consent).',
              'To operate and improve our website, product catalog, and solar calculator tools.',
              'To analyze website usage patterns and optimize the user experience.',
              'To verify your identity and prevent fraudulent transactions.',
              'To comply with legal obligations and regulatory requirements under Pakistani law.',
              'To manage our reseller and dealer network and related business relationships.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            3. Data Sharing & Disclosure
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share your information
            only in the following circumstances:
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Service Providers</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                We may engage trusted third-party companies to assist in operating our website, processing payments,
                delivering products (courier and logistics companies), and sending communications. These parties are
                bound by confidentiality agreements and are not permitted to use your data for other purposes.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Legal Requirements</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                We may disclose your information if required by law, court order, or government authority, including
                under the Prevention of Electronic Crimes Act (PECA) or other applicable Pakistani legislation.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Business Transfers</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                In the event of a merger, acquisition, or sale of company assets, your information may be transferred
                to the acquiring entity, subject to equivalent privacy protections.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">With Your Consent</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                We may share your information with other parties when you have explicitly consented to such sharing.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            4. Cookies & Tracking Technologies
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            Our website uses cookies and similar tracking technologies to enhance your browsing experience and collect
            usage analytics. Cookies are small text files stored on your device.
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Essential Cookies</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Required for the website to function properly, including maintaining your session state and enabling
                secure login to the admin portal.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Analytics Cookies</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                We use analytics tools to understand how visitors interact with our product catalog, which products are
                viewed most frequently, and how users navigate the website. This helps us improve our offerings.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Preference Cookies</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                These cookies remember your preferences, such as previously viewed product categories, to provide a
                personalized experience on subsequent visits.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-slate-600 text-sm">
              <strong>Managing Cookies:</strong> You can control and disable cookies through your browser settings.
              Note that disabling certain cookies may affect website functionality. Most modern browsers allow you to
              review and delete stored cookies at any time.
            </p>
          </div>
        </div>

        {/* Section 5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            5. Data Security
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            We take the security of your personal information seriously. Lams Power implements industry-standard
            technical and organizational measures to protect your data against unauthorized access, alteration,
            disclosure, or destruction.
          </p>
          <ul className="space-y-3">
            {[
              'Secure HTTPS encryption for all data transmitted between your browser and our servers.',
              'Access controls ensuring only authorized personnel can access customer data.',
              'Regular security audits and vulnerability assessments of our web infrastructure.',
              'Secure cloud-based database storage with row-level security policies.',
              'Employee training on data handling and privacy best practices.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#ea3838' }}></span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-amber-800 text-sm">
              <strong>Important:</strong> While we take all reasonable precautions, no method of data transmission
              over the internet is 100% secure. We cannot guarantee absolute security of your information.
            </p>
          </div>
        </div>

        {/* Section 6 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            6. Data Retention
          </h3>
          <p className="text-slate-700 leading-relaxed">
            We retain your personal information for as long as necessary to fulfill the purposes described in this
            Privacy Policy, or as required by applicable laws and regulations. Order and transaction records are
            typically retained for a minimum of five (5) years to comply with financial and tax regulations in
            Pakistan. When personal data is no longer needed, we securely delete or anonymize it.
          </p>
        </div>

        {/* Section 7 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            7. Your Rights
          </h3>
          <p className="text-slate-700 leading-relaxed mb-4">
            Depending on applicable law, you may have the following rights regarding your personal data:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Right to Access', desc: 'Request a copy of the personal information we hold about you.' },
              { title: 'Right to Rectification', desc: 'Request correction of inaccurate or incomplete personal data.' },
              { title: 'Right to Erasure', desc: 'Request deletion of your personal data under certain circumstances.' },
              { title: 'Right to Object', desc: 'Object to the processing of your data for marketing purposes.' },
              { title: 'Right to Restriction', desc: 'Request that we limit how we process your personal data.' },
              { title: 'Right to Portability', desc: 'Receive your data in a structured, commonly used format.' },
            ].map((right, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">{right.title}</h4>
                <p className="text-slate-600 text-xs leading-relaxed">{right.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-sm mt-4">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:contact@lamspower.pro.bd" className="font-bold underline" style={{ color: '#ea3838' }}>
              contact@lamspower.pro.bd
            </a>. We will respond to your request within 30 days.
          </p>
        </div>

        {/* Section 8 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            8. Children's Privacy
          </h3>
          <p className="text-slate-700 leading-relaxed">
            Our website and services are not directed to individuals under the age of 18. We do not knowingly collect
            personal information from minors. If you believe we have inadvertently collected data from a minor, please
            contact us immediately and we will take steps to delete such information.
          </p>
        </div>

        {/* Section 9 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            9. Changes to This Policy
          </h3>
          <p className="text-slate-700 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
            requirements, or other factors. When we make material changes, we will update the "Last Updated" date at
            the top of this page. We encourage you to review this policy periodically to stay informed about how we
            protect your information. Continued use of our website following any changes constitutes your acceptance
            of the updated policy.
          </p>
        </div>

        {/* Section 10 - Contact */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-4" style={{ color: '#ea3838' }}>
            10. Contact Us
          </h3>
          <p className="text-slate-300 leading-relaxed mb-6">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
            please do not hesitate to contact us:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ea3838' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Email</p>
                <a href="mailto:contact@lamspower.pro.bd" className="text-white font-semibold hover:underline" style={{ color: '#ea3838' }}>
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

export default PrivacyPolicy;
